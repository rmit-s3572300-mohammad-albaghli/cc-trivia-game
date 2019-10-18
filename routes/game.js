// user related things
const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../config/auth");
var fetch = require('node-fetch')
const serviceAccount = require('../config/google_key.json');
// Imports the Google Cloud client library.
const { BigQuery } = require('@google-cloud/bigquery');
const { projectID, player_table_name, question_table_name } = require("../config/keys");


// game page
router.get('/', ensureAuthenticated, async function(req, res) {
    var opentdb = ("https://opentdb.com/api.php?amount=1");
    var game = "";
    var game_choices = [];
    // Fetch the data from API
    await fetch(opentdb).then(response => response.json())
    .then(data => {
        game = data.results[0];
    })
    // Organise answers
    // Sanitise before pushing
    game_choices.push(decodeHtml(game.correct_answer));
    for(var i in game.incorrect_answers){
        // Sanitise before pushing
        game_choices.push(decodeHtml(game.incorrect_answers[i]));
    }
    // If multiple choice, shuffle the answers
    if(game.type == "multiple"){
        game_choices = shuffleAnswers(game_choices);
    }
    if(game.type == "boolean"){
        game_choices[0] = "True";
        game_choices[1] = "False";
    }
    var question = decodeHtml(game.question);
    // Update BigQuery
    // Check if BigQuery has the question
    const bigquery = new BigQuery({
        projectId: projectID,
        credentials: serviceAccount
    });
    const query = `SELECT question
        FROM \`${question_table_name}\`
        WHERE question="${question}"`;
    const options = {
        query: query
    };
    const [job] = await bigquery.createQueryJob(options);;
    const [rows] = await job.getQueryResults();
    rows.forEach(row => console.log(row));
    // If not, add question into the database (most likely case)
    if (rows.length == 0) {
        const insert_question = `INSERT INTO \`${question_table_name}\` (question, category, type, difficulty, correct_answer, win, lose)
        VALUES ('${question}', '${game.category}', '${game.type}', '${game.difficulty}', '${decodeHtml(game.correct_answer)}', 0, 0)` 
        await bigquery.createQueryJob(insert_question);
        console.log("Inserted new game_row into BigQuery");
    }
    // Check player's winrate
    const player_query = `SELECT *
        FROM \`${player_table_name}\`
        WHERE email="${req.user.email}"`;
    const player_options = {
        query: player_query
    };
    const [player_job] = await bigquery.createQueryJob(player_options);;
    const [player_rows] = await player_job.getQueryResults();
    // Calculate winrate
    const { win, lose } = player_rows[0];
    var winrate = (win/(win+lose))*100;
    winrate = winrate.toFixed(2);
    if (isNaN(winrate)) {
        winrate = "0"
    }
    // Render page
    res.render("game",{
        name: req.user.name,
        question: question,
        game_type: game.type,
        category: game.category,
        difficulty: game.difficulty,
        game_choices: game_choices,
        winrate: winrate,
        player_win: win,
        player_lose: lose
    });
});


// Post
router.post('/result', async function (req, res, next) {
    console.log(req.body);
    const { choice, question, player_win, player_lose } = req.body;
    // Retrieve the question from BigQuery
    const query = `SELECT *
        FROM \`${question_table_name}\`
        WHERE question='${question}'`;
    const options = {
        query: query
    };
    // Get bigquery const
    const bigquery = new BigQuery({
        projectId: projectID,
        credentials: serviceAccount
    });
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    const { category, difficulty, win, lose, correct_answer } = rows[0];
    console.log(rows[0]);
    var answer_status = "";
    if(choice == correct_answer) {
        //player win and question win count
        var p_win = parseInt(player_win) + 1;
        var q_win = parseInt(win) + 1;
        var answer_status = "You answer is correct!";
        const player_win_query = `UPDATE \`${player_table_name}\`
        SET win=${p_win}
        WHERE email='${req.user.email}'` 
        await bigquery.createQueryJob(player_win_query);
        const question_win_query = `UPDATE \`${question_table_name}\`
            SET win=${q_win}
            WHERE question='${question}'` 
        await bigquery.createQueryJob(question_win_query);
    } else {
        //player win and question lose count
        var p_lose =parseInt(player_lose) + 1;
        var q_lose = parseInt(lose) + 1;
        var answer_status = "Your answer is wrong";
        const player_lose_query = `UPDATE \`${player_table_name}\`
        SET lose=${p_lose}
        WHERE email='${req.user.email}'` 
        await bigquery.createQueryJob(player_lose_query);
        const question_lose_query = `UPDATE \`${question_table_name}\`
            SET lose=${q_lose}
            WHERE question='${question}'` 
        await bigquery.createQueryJob(question_lose_query);
    }
    res.render('result', {
        name: req.user.name,
        question: question,
        correct_answer: correct_answer,
        answer_status: answer_status,
        answer: choice,
        category: category,
        difficulty: difficulty
    });
});

// Make HTML entity readable for API 
function decodeHtml(str) {
    var entityPairs = [
        {character: '&', html: '&amp;'},
        {character: '<', html: '&lt;'},
        {character: '>', html: '&gt;'},
        {character: "", html: '&apos;'},
        {character: "", html: '&quot;'},
        {character: "", html: '&prime;'},
        {character: "", html: '&Prime;'},
        {character: "-", html: '&minus;'},
        {character: "", html: '&#039;'},
    ];

    entityPairs.forEach(function(pair){
        var reg = new RegExp(pair.html, 'g');
        str = str.replace(reg, pair.character);
    });
    return str;
}

//call this for multiple choice
function shuffleAnswers(gameChoices){
    var current = gameChoices.length, temporary, random;
    while (0 !== current) {
      //pick unshuffled 
      random = Math.floor(Math.random() * current);
      current -= 1;
      //swap it around with current element
      temporary = gameChoices[current];
      gameChoices[current] = gameChoices[random];
      gameChoices[random] = temporary;
    }
    return gameChoices;
}

// Post
module.exports = router;