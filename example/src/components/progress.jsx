import LCUI from 'lcui'

class Progress extends LCUI.Widget {
  constructor() {
    super()

    this.props = {
      total: Number,
      value: Number
    }
  }

  template() {
    return <Widget class="progress">
      <Widget ref="bar" class="bar" />
    </Widget>
  }
}

export default Progress
