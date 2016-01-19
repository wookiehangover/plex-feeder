'use strict'

const Joi = require('joi')
const uuid = require('uuid')
const find = require('lodash/find')
const map = require('lodash/map')
const path = require('path')
const execFile = require('child_process').execFile
const Hapi = require('hapi')
const server = new Hapi.Server()

server.connection({
  port: process.env.PORT || 3000
})

const downloadHandlers = []

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

  return id
}

// Create a global entry for the active download, removing itself when the
// download completes
function registerDownload(id, payload, child) {
  const download = {
    id, payload, child
  }

  downloadHandlers.push(download)
}

function subscribe(socket, download) {
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
      id: download.id,
      destroy: true
    })

    let index = downloadHandlers.indexOf(download)
    downloadHandlers.splice(index, 1)
  })
}

// Pipe any live download handers to the incoming socket connection
function broadcastProgress(socket) {
  downloadHandlers.forEach(subscribe.bind(null, socket))

  socket.on('register', (download) => {
    const handler = find(downloadHandlers, { id: download.id })
    console.log(download)
    if (handler) {
      subscribe(socket, handler)
    }
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

  server.method('download', function(payload, next) {
    const id = createDownload(payload)
    next(null, id)
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
            assign: 'id'
          }
        ]
      },
      handler: function(request, reply) {
        const response = reply({
          payload: request.payload,
          id: request.pre.id
        })
        response.statusCode = 201
        return response
      }
    },
    {
      method: 'GET',
      path: '/',
      handler: function(request, reply) {
        const downloads = map(downloadHandlers, download => {
          return { id: download.id, payload: download.payload }
        })
        reply.view('index', {
          downloads
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
