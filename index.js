#!/usr/bin/env node

const inquirer = require("inquirer")
const fs = require("fs")
const path = require("path")
const chalk = require("chalk")
const figlet = require("figlet")
const shell = require("shelljs")
const Spinner = require("cli-spinner").Spinner
const axios = require("axios")
const Vimeo = require("vimeo").Vimeo

const spinner = new Spinner("%s Loading Videos from API... ")

const init = () => {
  console.log(
    chalk.white.bold.bgCyan(
      figlet.textSync("Vimeo DL", {
        font: "Alligator2",
        horizontalLayout: "default",
        verticalLayout: "default"
      })
    )
  )
  console.log(" ")
  console.log(" ")
}

const askQuestions = () => {
  const questions = [
    {
      name: "TOKEN",
      type: "input",
      message: "Input Vimeo app access token (make sure that it has the video_file scope):"
    },
    {
      name: "ID",
      type: "input",
      message: "Input client ID:"
    },
    {
      name: "SECRET",
      type: "input",
      message: "Input client secret:"
    }
  ]
  
  return inquirer.prompt(questions)
}

const vimeoInitialTest = (error, body, status_code, headers) => {
  spinner.isSpinning() ? spinner.stop() : null
  if(error) {
    console.log(error)
    return error
  } else {
    console.log(`total videos found: ${body.total}`)
    for(var i=0; i<body.data[0].files.length; i++) {
      let e = body.data[0].files[i]
      if(e.quality==='hd' && e.width===1920) {
        const response = axios(
          {
            url:"https://player.vimeo.com/external/340289751.hd.mp4?s=99620937b375a93a1a021a389f804842f638a6db&profile_id=175&oauth2_token_id=1225356879",
            method:'GET',
            responseType:'stream'
          }
        )

        response.data.pipe(fs.createWriteStream(path.resolve(__dirname)))
      } else {

      }
    }
    return body
  }
}

const success = () => {
  return 0
}

const run = async () => {
  init()

  const answers = await askQuestions()
  let { ID, SECRET, TOKEN } = answers

  const vimeoClient = new Vimeo(ID, SECRET, TOKEN)

  asdf = vimeoClient.request({
    method: 'GET',
    path: '/me/videos',
    query: {
      per_page: 1,
      fields: "files"
    }
  }, vimeoInitialTest)
  
  spinner.start()
}

//run()

async function dl() {
  const writer = fs.createWriteStream(path.resolve(__dirname,'asdf.mp4'))
  const response = await axios(
    {
      url:"https://player.vimeo.com/external/340289751.hd.mp4?s=99620937b375a93a1a021a389f804842f638a6db&profile_id=175&oauth2_token_id=1225356879",
      method:'GET',
      responseType:'stream'
    }
  )

  const size = response.headers['content-length']
  console.log(size)
  let downloaded = 0
  spinner.start()
  response.data.on('data', (data) => {
    downloaded += Buffer.byteLength(data)
    spinner.setSpinnerTitle(`progress: ${Math.round(downloaded/(1024*1024))}/${Math.round(size/(1024*1024))}`)
  })
  response.data.on('end', ()=> {
    spinner.stop()
    console.log(" ")
    console.log("IT'S DONE")
  })
  response.data.pipe(writer)

  return new Promise((resolve,reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

dl()