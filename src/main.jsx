import React from 'react'
import { render } from 'react-dom'
import find from 'lodash/find'

const io = window.io
const socket = io.connect(location.host)
const activeDownloads = window._ACTIVE_DOWNLOADS || []
const container = document.getElementById('downloads')

const Downloads = React.createClass({
  render() {
    return (
      <ul className="DownloadList">
        {this.props.data.map(download =>
          <li>
            <h1>{download.payload.title}</h1>
            <div className="ProgressBar" style={{ width: download.percent }}></div>
            <pre>{download.progress || ''}</pre>
          </li>
        )}
      </ul>
    )
  }
})

render(<Downloads data={activeDownloads} />, container)

socket.on('progress', data => {
  const file = find(activeDownloads, { id: data.id })
  const percent = data.progress.match(/\d+%/)

  file.progress = data.progress
  if (percent && percent[0]) {
    file.percent = percent
  }

  render(<Downloads data={activeDownloads} />, container)
})
