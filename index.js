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
  require('inert'),
  require('hapi-io')
]





server.register(plugins, err => {
  if (err) throw err

  const io = server.plugins['hapi-io'].io

  function download(payload, done) {
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

    // child.stdout.pipe(process.stdout)
    // child.stderr.pipe(process.stderr)

    child.stdout.on('data', (data) => console.log(data.toString))

    io.on('connection', socket => {
      console.log('client connected')
      child.stdout.on('socket[data]', chunk => {
        console.log('data event')
        socket.emit('progress', {
          progress: chunk.toString(),
          title: payload.title
        })
      })

      child.stdout.on('end', _ => {
        console.log('download complete')
        socket.emit('progress', {
          progress: `Download Complete`,
          title: payload.title
        })
      })
    })

    done(null, child)
  }

  server.method('download', download)

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
      handler: {
        file: 'public/download.html'
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
