// user related things
const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../config/auth");
const { loggedIn } = require("../config/auth");
const serviceAccount = require('../config/google_key.json');
// Imports the Google Cloud client library.
const { BigQuery } = require('@google-cloud/bigquery');
const { projectID, player_table_name, question_table_name } = require("../config/keys");

// Get routes
// home page
router.get('/', loggedIn, (req, res) => res.render("home"));
// dashboard

router.get('/dashboard', ensureAuthenticated, (req, res) => res.render("dashboard", {
    name: req.user.name
}));

// leaderboard pages
// Sort by winrate
router.get('/leaderboard_winrate', async function (req, res) {
    const bigquery = new BigQuery({
        projectId: projectID,
        credentials: serviceAccount
    });
    const player_query = `SELECT *
        FROM \`${player_table_name}\`
        WHERE win >= 1 OR lose >= 1
        ORDER BY (win/(win+lose)*100) DESC`;
    const player_options = {
        query: player_query
    };
    const [player_job] = await bigquery.createQueryJob(player_options);;
    const [player_rows] = await player_job.getQueryResults();
    console.log(player_rows);
    res.render("leaderboard_winrate", {
        player_rows: player_rows
        });
});

// Sort by win count
router.get('/leaderboard_wincount', async function (req, res) {
    const bigquery = new BigQuery({
        projectId: projectID,
        credentials: serviceAccount
    });
    const player_query = `SELECT *
        FROM \`${player_table_name}\`
        WHERE win >= 1 OR lose >= 1
        ORDER BY win DESC`;
    const player_options = {
        query: player_query
    };
    const [player_job] = await bigquery.createQueryJob(player_options);;
    const [player_rows] = await player_job.getQueryResults();
    console.log(player_rows);
    res.render("leaderboard_wincount", {
        player_rows: player_rows
        });
});

// Sort questions by "hardest" 
router.get('/hardest_question', async function (req, res) {
    const bigquery = new BigQuery({
        projectId: projectID,
        credentials: serviceAccount
    });
    const question_query = `SELECT  *
        FROM \`${question_table_name}\`
        WHERE win >= 1 OR lose >= 1
        ORDER BY lose DESC`;
    const question_options = {
        query: question_query
    };
    const [question_job] = await bigquery.createQueryJob(question_options);;
    const [question_rows] = await question_job.getQueryResults();
    console.log(question_rows);
    res.render("hardest_question", {
        question_rows: question_rows
        });
});

module.exports = router;