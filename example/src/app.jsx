/* eslint-disable */
import {
  App,
  Widget,
  Button,
  TextView,
  TextEdit
} from 'lcui'
import Progress from './components/progress'
import './app.css'

class MyApp extends App {
  constructor() {
    super()

    // Define internal state data
    this.state = {
      text: 'World',
      input: 'Trad',
      value: 50,
      total: 100
    }
    Progress.install()
  }

  template() {
    return (<Widget class="example">
      <TextView class="mb-2">Hello, {this.state.text}!</TextView>
      <Widget class="form-control">
        <TextEdit ref="input" value={this.state.input} placeholder="Input text..." />
        <Button onClick={this.onBtnChangeClick}>Change</Button>
      </Widget>
      <TextView class="mb-2">
        Please click button to test progress
        ({this.state.value / this.state.total * 100 + '%'})
      </TextView>
      <Progress class="mb-2" value={this.state.value} total={this.state.total} />
      <Widget class="button-group">
        <Button onClick={this.onBtnMinusClick}>-</Button>
        <Button onClick={this.onBtnPlusClick}>+</Button>
      </Widget>
    </Widget>)
  }

  onBtnChangeClick() {
    this.state.text = this.refs.input.value.toString()
  }

  onBtnMinusClick() {
    if (this.state.value > 0) {
      this.state.value -= 10
    }
  }

  onBtnPlusClick() {
    if (this.state.value < 100) {
      this.state.value += 10
    }
  }
}

export function main() {
  const app = new MyApp()

  return app.run()
}
