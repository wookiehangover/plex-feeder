import React, { PropTypes } from 'react'
import { findDOMNode } from 'react-dom'

const Form = React.createClass({
  propTypes: {
    onUpdate: PropTypes.func.isRequired
  },

  getInitialState() {
    return {}
  },

  handleSubmit(e) {
    e.preventDefault()

    const node = findDOMNode(this)

    fetch('/download', { method: 'post', body: new FormData(node) })
      .then(response => response.json())
      .then((json) => {
        console.log(json)
        this.props.onUpdate(json)
        this.setState({ title: '', url: '', directory: '' })
      })
      .catch((error) => {
        console.error(error)
      })
  },

  linkState(name, e) {
    let state = {}
    state[name] = e.target.value
    this.setState(state)
  },

  render() {
    return (
      <form className="create-download" method="POST" action="download" onSubmit={this.handleSubmit}>
        <div className="control-group">
          <input type="text" name="url" placeholder="Put.io download link..." required value={this.state.url} onChange={this.linkState.bind(null, 'url')}/>
        </div>
        <div className="control-group">
          <input type="text" name="title" placeholder="Title" required value={this.state.title} onChange={this.linkState.bind(null, 'title')}/>
        </div>
        <div className="control-group">
          <input type="text" className="form-control-sm" name="directory" placeholder="Directory" required value={this.state.directory} onChange={this.linkState.bind(null, 'directory')}/>
          <select name="type" className="form-control-sm" required value={this.state.type} onChange={this.linkState.bind(null, 'type')}>
            <option>Movies</option>
            <option>TV</option>
          </select>
        </div>
        <button>Submit</button>
      </form>
    )
  }
})

export default Form
