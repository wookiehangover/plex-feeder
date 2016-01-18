'use strict'

const Hapi = require('hapi')
const Joi = require('joi')
const path = require('path')
const execFile = require('child_process').execFile
const uuid = require('uuid')
const map = require('lodash/map')
const server = new Hapi.Server()

let downloadHandlers = []

server.connection({
  port: process.env.PORT || 3000
})

// Launches a download script (wget) and registers the active download
//
// Returns a child process
function createDownload(payload) {
  const options = {
    maxBuffer: 1024e10
  }

  let directory = payload.directory

  if (payload.type === 'Movies') {
    directory = `${payload.title} [${payload.directory}]`
    options.cwd = '/treehouse/Media/Movies'
  } else {
    options.cwd = '/treehouse/Media/TV Shows'
  }

  const child = execFile(
    path.join(__dirname, 'scripts', 'download.sh'),
    [ payload.url, payload.title, directory ],
    options
  )

  const id = uuid.v1()

  registerDownload(id, payload, child)

  return child
}

// Create a global entry for the active download, removing itself when the
// download completes
function registerDownload(id, payload, child) {
  const download = {
    id, payload, child
  }

  downloadHandlers.push(download)

  child.stdout.on('end', function() {
    let index = downloadHandlers.indexOf(download)
    downloadHandlers = downloadHandlers.slice(index, index + 1)
  })
}

// Pipe any live download handers to the incoming socket connection
function broadcastProgress(socket) {
  downloadHandlers.forEach(function(download) {
    function progress(chunk) {
      socket.emit('progress', {
        progress: chunk.toString(),
        payload: download.payload,
        id: download.id
      })
    }

    download.child.stderr.on('data', progress)
    download.child.stdout.on('data', progress)

    download.child.stdout.on('end', function() {
      socket.emit('progress', {
        progress: `Download Complete`,
        payload: download.payload,
        id: download.id
      })
    })
  })
}

const plugins = [
  {
    register: require('good'),
    options: {
      reporters: [{
        reporter: require('good-console'),
        events: { log: '*', response: '*' }
      }]
    }
  },
  require('vision'),
  require('inert'),
  require('hapi-io')
]

server.register(plugins, err => {
  if (err) throw err

  server.views({
    engines: { ejs: require('ejs') },
    relativeTo: __dirname,
    path: 'templates'
  })

  const io = server.plugins['hapi-io'].io

  io.on('connection', broadcastProgress)

  server.method('download', function (payload, done) {
    const child = createDownload(payload)
    done(null, child)
  })

  server.route([
    {
      method: 'POST',
      path: '/download',
      config: {
        validate: {
          payload: {
            title: Joi.string(),
            url: Joi.string(),
            directory: Joi.string().default('.'),
            type: Joi.string().valid(['Movies', 'TV'])
          }
        },
        pre: [
          {
            method: 'download(payload)',
            assign: 'child'
          }
        ]
      },
      handler: function(request, reply) {
        reply.redirect('/')
      }
    },
    {
      method: 'GET',
      path: '/',
      handler: function(request, reply) {
        reply.view('index', {
          downloads: map(downloadHandlers, 'payload')
        })
      }
    },
    {
      method: 'GET',
      path: '/{p*}',
      handler: {
        directory: {
          path: 'public'
        }
      }
    }
  ])

  server.start(err => {
    console.log('Server running at: ', server.info.uri)
  })
})
