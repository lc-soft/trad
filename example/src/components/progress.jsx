import LCUI from 'lcui'
import './progress.css'

class Progress extends LCUI.Widget {
  constructor() {
    super()

    this.props = {
      total: 100,
      value: 0
    }
  }

  update() {
    const percentage = this.props.value * 100 / this.props.total

    this.refs.bar.style.width = percentage + '%'
    if (percentage < 30) {
      this.refs.bar.style.backgroundColor = '#d95c5c'
    } else if (percentage < 60) {
      this.refs.bar.style.backgroundColor = '#efbc72'
    } else if (percentage < 70) {
      this.refs.bar.style.backgroundColor = '#ddc928'
    } else if (percentage < 90) {
      this.refs.bar.style.backgroundColor = '#b4d95c'
    } else if (percentage < 100) {
      this.refs.bar.style.backgroundColor = '#66da81'
    } else {
      this.refs.bar.style.backgroundColor = '#21ba45'
    }
  }

  template() {
    return <Widget class="progress">
      <Widget ref="bar" class="progress-bar" />
    </Widget>
  }
}

export default Progress
