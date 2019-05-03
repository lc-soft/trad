import LCUI from 'lcui'

class Progress extends LCUI.Widget {
  constructor() {
    super()

    this.props = {
      total: Number,
      value: Number
    }
  }

  update() {
    const percentage = this.props.value * 100 / this.props.total

    this.refs.bar.style.width = percentage + '%'
  }

  template() {
    return <Widget class="progress">
      <Widget ref="bar" class="bar" />
    </Widget>
  }
}

export default Progress
