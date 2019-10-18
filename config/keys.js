module.exports = {
    // Enter your MongoURI here...
    MongoURI: "",
    // For the program to work correctly, please place your Google service account key JSON file in config folder
    // Enter your BigQuery Project ID here
    projectID: "",
    // Enter your table name for player dataset so it looks like "projectid.dataset.tablename"
    // You can read more on how to create service account at https://cloud.google.com/docs/authentication/production
    // Make sure your table have the following column (in this order): name, email, win, lose
    player_table_name: "",
    // Enter your table name for questions dataset so it looks like "projectid.dataset.tablename"
    // Make sure your table have the following column (in this order): question, category, type, difficulty, correct_answer, win, lose
    question_table_name: ""
}