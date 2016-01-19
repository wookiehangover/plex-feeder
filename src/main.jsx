import React from 'react'
import { render } from 'react-dom'
import find from 'lodash/find'
import throttle from 'lodash/throttle'
import Form from './Form.jsx'

const io = window.io
const socket = io.connect(location.host)
const container = document.getElementById('downloads')
let activeDownloads = window._ACTIVE_DOWNLOADS || []

const Downloads = React.createClass({
  render() {
    return (
      <ul className="DownloadList">
        {this.props.data.map(download => {
          return (
            <li key={download.id}>
              <h1>{download.payload.title}</h1>
              <div className="ProgressBar" style={{ width: download.percent }}></div>
              <pre>{download.progress || ''}</pre>
            </li>
          )
        })}
      </ul>
    )
  }
})

function renderDownloads() {
  render(<Downloads data={activeDownloads} />, container)
}

render(
  <Form onUpdate={download => {
    activeDownloads.push(download)
    renderDownloads()
    socket.emit('register', download)
  }} />,
  document.getElementById('form')
)

renderDownloads()

socket.on('progress', throttle(data => {
  let file = find(activeDownloads, { id: data.id })

  if (!file) {
    file = data
    activeDownloads.push(file)
  }

  const percent = data.progress.match(/\d+%/)

  file.progress = data.progress
  if (percent && percent[0]) {
    file.percent = percent
  }

  if (data.destroy) {
    setTimeout(_ => {
      let index = activeDownloads.indexOf(file)
      activeDownloads.splice(index, 1)
      renderDownloads()
    }, 5000)
  }

  renderDownloads()
}, 200))
