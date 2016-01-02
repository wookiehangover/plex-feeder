'use strict'

const Hapi = require('hapi')
const Joi = require('joi')
const path = require('path')
const execFile = require('child_process').execFile
const server = new Hapi.Server()
server.connection({ port: process.env.PORT || 3000 })

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
  require('inert')
]

function downloadMovie(payload) {
  const options = {
    cwd: '/treehouse/Media/Movies',
    maxBuffer: 1024e10
  }

  const child = execFile(
    path.join(__dirname, 'scripts', 'download.sh'),
    [ payload.url, payload.title, payload.year ],
    options,
    (err) => {
      if (err) {
        console.log('Error downloading: ', err)
      } else {
        console.log('Downloading Complete.')
      }
    }
  )

  child.stdout.pipe(process.stdout)
  child.stderr.pipe(process.stderr)
}

server.register(plugins, err => {
  if (err) throw err

  server.route([
    {
      method: 'POST',
      path: '/download',
      config: {
        validate: {
          payload: {
            title: Joi.string(),
            url: Joi.string(),
            type: Joi.string().valid(['Movies', 'TV']),
            year: Joi.number()
          }
        }
      },
      handler: (request, reply) => {
        if (request.payload.type === 'Movies') {
          downloadMovie(request.payload)
        }
        reply(request.payload)
      }
    },
    {
      method: 'GET',
      path: '/',
      handler: {
        file: 'public/index.html'
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
