import React, { PureComponent, Fragment } from 'react'
import './styles.css'

function debounce(fn, delay) {
  let timer = null

  return function () {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, arguments), delay)
  }
}

const initialState = {
  query: '',
  suggestions: [],
  focusedIndex: -1,
  isOpen: false,
}

class ReactSuggestions extends PureComponent {
  static defaultProps = {
    token: '',
    query: '',
    min: 2,
    count: 10,
    delay: 0,
  }

  constructor(props) {
    super(props)

    this.state = initialState

    if (!props.token) {
      console.warn('react-suggestions: You need pass dadata api-key to props. See https://dadata.ru/api/suggest/')
    }
  };

  componentDidMount() {
    this.setState({
      query: this.props.query,
    })
  };

  componentWillReceiveProps(nextProps) {
    if (nextProps.query !== this.props.query) {
      this.setState({
        query: nextProps.query,
      })
    }

    if (nextProps.token !== this.props.token) {
      if (!nextProps.token) {
        console.warn('react-suggestions: You need pass dadata api-key to props. See https://dadata.ru/api/suggest/')
      }
    }
  };

  loadSuggestions = debounce((query, token, count, locations = []) => {
    if (this.xhr) {
      this.xhr.abort()
    }

    this.xhr = new XMLHttpRequest()
    this.xhr.open("POST", "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address")
    this.xhr.setRequestHeader("Accept", "application/json")
    this.xhr.setRequestHeader("Authorization", `Token ${token}`)
    this.xhr.setRequestHeader("Content-Type", "application/json")
    this.xhr.send(JSON.stringify({ query, count, locations }))

    this.xhr.onreadystatechange = () => {
      if (this.xhr.readyState != 4) {
        return
      }

      if (this.xhr.status == 200) {
        let response = JSON.parse(this.xhr.response)

        if (response && response.suggestions) {
          this.setState({ suggestions: response.suggestions })
        }
      }
    }
  }, this.props.delay)

  handleChange = (evt) => {
    let { min, token, count, delay, locations } = this.props

    if (!token) { return }

    let { value: query } = evt.target
    let state = { query, isOpen: true }

    if (query.length < min) {
      state.suggestions = []
    } else {
      this.loadSuggestions(query, token, count, locations)
    }

    this.setState({ ...state })
  }

  handleFocus = (evt) => {
    let { onFocus } = this.props

    this.setState({ isOpen: true })

    if (typeof onFocus === 'function') onFocus(evt)
  }

  handleBlur = (event) => {
    const { onBlur } = this.props
    const { suggestions } = this.state

    this.setState({
      isOpen: false,
      focusedIndex: -1,
    })

    if (typeof onBlur === 'function') onBlur(event, suggestions[0])
  }

  handleHover = (focusedIndex) => {
    this.setState({ focusedIndex })
  }

  handleKeyPress = (evt) => {
    if ([40, 38, 13].includes(evt.which)) {
      evt.preventDefault()

      let { suggestions, focusedIndex: index } = this.state
      let length = this.props.count - 1

      if (evt.which === 40) {
        let result = index === length || index === -1 ? 0 : ++index

        this.setState({ focusedIndex: result })
      }

      if (evt.which === 38) {
        let result = index === 0 || index === -1 ? length : --index

        this.setState({ focusedIndex: result })
      }

      if (evt.which === 13 && index !== -1 && suggestions[index]) {
        this.handleSelect(suggestions[index], index)
      }
    }
  }

  handleSelect = (suggestion, index) => {
    let { onChange } = this.props

    this.setState({
      query: suggestion.value,
      isOpen: false,
    })

    if (typeof onChange === 'function') onChange(suggestion, index)
  }

  renderSuggestions = () => {
    let { suggestions, focusedIndex } = this.state

    let result = suggestions.map((suggestion, index) => {
      let itemCns = index === focusedIndex ? 'focused': ''

      return (
        <li
          className={ itemCns }
          key={ index }
          onMouseDown={ () => this.handleSelect(suggestion, index)}
          onMouseEnter={ () => this.handleHover(index) }>
          { suggestion.value }
        </li>
      )
    })

    return result
  }

  render() {
    let { query: omit, token, min, count, suggestionsClass, delay, locations, ...rest } = this.props
    let { query, suggestions, isOpen, focusedIndex } = this.state

    return (
      <Fragment>
        <input
          { ...rest }
          type="text"
          value={ query }
          onChange={ this.handleChange }
          onFocus={ this.handleFocus }
          onBlur={ this.handleBlur }
          onKeyPress={ this.handleKeyPress }
          onKeyDown={ this.handleKeyPress }
        />
        <div className={`react-suggestions ${suggestionsClass || ''}`}>
          { !!suggestions.length && isOpen && <ul>{ this.renderSuggestions() }</ul> }
        </div>
      </Fragment>
    )
  };
}

export default ReactSuggestions
