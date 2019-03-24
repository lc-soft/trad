import { Widget } from 'lcui/widgets'

interface Progress {
  bar: Widget
  _total: number
  _value: number
}

class Progress extends Widget {
  set total(value:number) {
    this._total = value
    this.update()
  }

  get total() {
    return this._total
  }

  set value(value:number) {
    this._value = value
    this.update()
  }

  get value() {
    return this._value
  }

  update() {
    const percentage:number = this._value * 100 / this._total

    this.bar.style.width = percentage + '%'
  }

  created() {
    this.total = 100
    this.value = 0
  }

  template() {
    return <Widget class="progress">
      <Widget ref="bar" class="bar" />
    </Widget>
  }
}

export default Progress
