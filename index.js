#!/usr/bin/env node

const inquirer = require("inquirer")
const fs = require("fs")
const path = require("path")
const chalk = require("chalk")
const figlet = require("figlet")
const Spinner = require("cli-spinner").Spinner
const axios = require("axios")
const Vimeo = require("vimeo").Vimeo

const spinner = new Spinner("%s Checking for previous download info... ")
spinner.setSpinnerDelay(100)
var LOGPATH
var ID
var SECRET
var TOKEN
var FILEPATH

var TOTALSIZE = 0
var TOTALBYTESDOWNLOADED = 0
var TOTALFILESDOWNLOADED = 0
var TOTALFILES
var TOTALPAGES
var FILES = []
var TOTAL_LOADING_DONE = 0

//what the fuck are global variables. what do you mean this is a bad

const run = async () => {
  init()

  spinner.start()

  try {
    spinner.stop()
    if(fs.existsSync('files.json')) {
      console.log("")

      const answers = await askContinue()

      if(answers.RESTART.toLowerCase()=="y"||answers.RESTART.toLowerCase()=="yes") {
        const files = require(path.resolve(__dirname,"files.json"))
        ID = files.ID
        SECRET = files.SECRET
        TOKEN = files.TOKEN
        FILEPATH = files.FILEPATH
        TOTALFILES = files.TOTALFILES
        TOTALFILESDOWNLOADED = files.TOTALFILESDOWNLOADED
        TOTALBYTESDOWNLOADED = files.TOTALBYTESDOWNLOADED
        FILES = files.FILES

        fs.writeFile(path.resolve(__dirname,FILEPATH,'LOG'),"",(err) => {
          if(err) throw err
          LOGPATH = path.resolve(__dirname,FILEPATH,'LOG')
          downloadFiles()
        })
      } else {
        console.log("")
        runTraditional()
      }
    } else {
      console.log("")
      runTraditional() 
    }
  } catch(err) {
    console.error(err)
  }
}

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

const exitCantCreateClient = () => {
  console.log("Something went wrong... we can't create the vimeo client!")
  process.exit()
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
    },
    {
      name: "FILEPATH",
      type: "input",
      message: "Specify filepath to save videos to:"
    }
  ]
  
  return inquirer.prompt(questions)
}

const askContinue = () => {
  const filesJson = require(path.resolve(__dirname,"files.json"))
  const questions = [
    {
      name: "RESTART",
      type: "input",
      message: `Would you like to continue your download? ${filesJson.TOTALFILESDOWNLOADED}/${filesJson.TOTALFILES} videos downloaded (y/n)`
    }
  ]

  return inquirer.prompt(questions)
}

const downloadFiles = () => {
  spinner.setSpinnerTitle("%s Preparing files for download...")
  FILES.forEach(e => {
    spinner.isSpinning() ? null : spinner.start()
    let uri = (e.uri.split("/"))[2]
    if(e.files.length) {
      let dlLink = false
      let fileList = e.files.filter(e => e.quality=='hd'||e.quality=='sd')
      let fileToUse
      if(fileList.length) {
        fileList.sort((a,b) => b.width-a.width)
        fileToUse = fileList[0]
        dlLink = fileToUse.link
      }
  
      if(dlLink) {
        let type = (fileToUse.type.split("/"))[1]
        let filename = uri.concat(".",type)
        e.trueURI = uri
        e.filename = filename
        e.link = dlLink
        TOTALSIZE += fileToUse.size
      } else {
        fs.open(LOGPATH,'a',777,(e,id) => {
          fs.write(id, `Error getting download link for uri ${uri}\n`,null,'utf8',() => {
            fs.close(id, () => {
              console.log("")
              console.log(`Error getting download link for uri ${uri}`)
            })
          })
        })
      }
    } else {
      fs.open(LOGPATH,'a',777,(e,id) => {
        fs.write(id, `Files corrupted or missing for uri ${uri}\n`,null,'utf8',() => {
          fs.close(id, () => {
            console.log("")
            console.log(`Files corrupted or missing for uri ${uri}`)
          })
        })
      })
    }
  })

  console.log("")
  spinner.setSpinnerTitle("%s Downloading files...")
  dl(FILES[TOTALFILESDOWNLOADED].link,FILEPATH,FILES[TOTALFILESDOWNLOADED].filename)
}

const dl = async (link,filepath,filename) => {
  if(link) {
    let filesJson = require(path.resolve(__dirname,"files.json"))
    const writer = fs.createWriteStream(path.resolve(__dirname,filepath,filename))
    const response = await axios(
      {
        url:link,
        method:'GET',
        responseType:'stream'
      }
    )

    spinner.isSpinning() ? null : spinner.start()
    response.data.on('data', (data) => {
      TOTALBYTESDOWNLOADED += Buffer.byteLength(data)
      const progress = 3*Math.round(100*(TOTALBYTESDOWNLOADED/TOTALSIZE))/10
      spinner.setSpinnerTitle(`%s Downloaded ${TOTALFILESDOWNLOADED}/${TOTALFILES} FILES | ${Math.round(10*TOTALBYTESDOWNLOADED/(1024*1024*1024))/10}GB/${Math.round(10*TOTALSIZE/(1024*1024*1024))/10}GB |${"=".repeat(Math.round(progress))}${"-".repeat(Math.round(30-progress))}|`)
    })
    response.data.on('end', ()=> {
      TOTALFILESDOWNLOADED++
      filesJson.TOTALFILESDOWNLOADED = TOTALFILESDOWNLOADED
      filesJson.TOTALBYTESDOWNLOADED = TOTALBYTESDOWNLOADED
      if(TOTALFILESDOWNLOADED==TOTALFILES) {
        filesJson = JSON.stringify(filesJson, null, 2)
        fs.writeFile('files.json',filesJson, (err) => {
          if(err) throw err
          finish()
        })
      } else {
        filesJson = JSON.stringify(filesJson, null, 2)
        fs.writeFile('files.json',filesJson, (err) => {
          if(err) throw err
          dl(FILES[TOTALFILESDOWNLOADED].link,FILEPATH,FILES[TOTALFILESDOWNLOADED].filename)
        })
      }
    })
    response.data.pipe(writer)
  
    return new Promise((resolve,reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })
  } else {
    fs.open(LOGPATH,'a',777,(e,id) => {
      fs.write(id, `Did not download file ${FILES[TOTALFILESDOWNLOADED].uri}\n`,null,'utf8',() => {
        fs.close(id, () => {
          console.log("")
          console.log(`Did not download file ${FILES[TOTALFILESDOWNLOADED].uri}`)
        })
      })
    })
    TOTALFILESDOWNLOADED++
    filesJson.TOTALFILESDOWNLOADED = TOTALFILESDOWNLOADED
    filesJson = JSON.stringify(filesJson, null, 2)
    fs.writeFile('files.json',filesJson, (err) => {if(err) throw err})
    dl(FILES[TOTALFILESDOWNLOADED].link,FILEPATH,FILES[TOTALFILESDOWNLOADED].filename)
  }
}

const finish = () => {
  spinner.stop()
  if(TOTALFILES > 200) {
    console.log("Oh thank goodness. It's over. It's finally over.")
  } else {
    console.log("Done! Thanks for using dl-vimeo!")
  }
  process.exit()
}

const recordFiles = (files) => {
  let filesToRecord = {
    ID: ID,
    SECRET: SECRET,
    FILEPATH: FILEPATH,
    TOTALFILES: TOTALFILES,
    TOTALFILESDOWNLOADED: TOTALFILESDOWNLOADED,
    TOTALBYTESDOWNLOADED: TOTALBYTESDOWNLOADED,
    FILES: files
  }

  filesToRecord = JSON.stringify(filesToRecord, null, 2)

  fs.writeFile('files.json', filesToRecord, (err) => { 
    if(err) throw err
    console.log("")
    console.log("File data written to files.json")
    downloadFiles()
  })
}

const loadVideoData = (pages) => {
  const vimeoClient = ID ? new Vimeo(ID, SECRET, TOKEN) : exitCantCreateClient()
  for(let i=1; i<=pages; i++) {
    vimeoClient.request({
      method:'GET',
      path:`/me/videos?per_page=100&page=${i}`,
      query: {
        per_page:100,
        fields:"uri,files"
      }
    },(error,body,status_code,headers) => {
      if(error) {
        console.log(error)
        console.log(`HTTP STATUS CODE: ${status_code}`)
        process.exit()
      } else {
        body.data.forEach(e => {
          FILES.push(e)
          TOTAL_LOADING_DONE++
          spinner.setSpinnerTitle(`%s Loading all video data from Vimeo API... ${TOTAL_LOADING_DONE}/${TOTALFILES}`)
        })
        if(TOTAL_LOADING_DONE==TOTALFILES) {
          spinner.setSpinnerTitle("%s Loading complete! Making sure everything is in order... ")
          recordFiles(FILES)
        }
      }
    })
  }
}

const vimeoInitialTest = (error, body, status_code, headers) => {
  spinner.isSpinning() ? spinner.stop() : null
  if(error) {
    console.log(error)
    process.exit()
  } else {
    console.log(`total videos found: ${body.total}`)
    TOTALFILES = body.total
    TOTALPAGES = Math.ceil(body.total/100)
    spinner.setSpinnerTitle("%s Loading all video data from Vimeo API... ")
    spinner.start()
    loadVideoData(TOTALPAGES)
  }
}

const runTraditional = async () => {
  const answers = await askQuestions()
  ID = answers.ID
  SECRET = answers.SECRET
  TOKEN = answers.TOKEN
  FILEPATH = answers.FILEPATH
  FILEPATH = FILEPATH=="" ? "videos/" : FILEPATH

  fs.writeFile(path.resolve(__dirname,FILEPATH,'LOG'),"",(err) => {
    if(err) throw err
    LOGPATH = path.resolve(__dirname,FILEPATH,'LOG')
  })

  const vimeoClient = new Vimeo(ID, SECRET, TOKEN)

  vimeoClient.request({
    method: 'GET',
    path: '/me/videos',
    query: {
      per_page: 1,
      fields: "uri"
    }
  }, vimeoInitialTest)      
}

run()