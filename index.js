#!/usr/bin/env node

const inquirer = require("inquirer")
const chalk = require("chalk")
const figlet = require("figlet")
const shell = require("shelljs")
const Vimeo = require("vimeo").Vimeo

const init = () => {
  console.log(
    chalk.green(
      figlet.textSync("Node JS", {
        font: "Ghost",
        horizontalLayout: "default",
        verticalLayout: "default"
      })
    )
  )
}

const askQuestions = () => {
  const questions = [
    {
      name: "Access Token",
      type: "input",
      message: "What is your Vimeo API App's access token? (Make sure that it has the video_file scope)"
    }
  ]
  
  return inquirer.prompt(questions)
}

const success = () => {
  return 0
}

const run = async () => {
  init()

  const answers = await askQuestions()
  const { TOKEN } = answers

  const vimeoClient = new Vimeo()

  vimeoClient.request({
    method: 'GET',
    path: '/tutorial'
  }, (error, body, status_code, headers) => {
    if(error) {
      console.log(error)
    }
    console.log(body)
  })
}

run()