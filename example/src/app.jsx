import {
  App,
  Widget,
  Button,
  String,
  Number,
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
      input: 'World',
      value: 50,
      total: 100
    }
    Progress.install()
  }

  template() {
    return (<Widget class="example">
      <TextView class="item">Hello, {this.state.text}!</TextView>
      <Widget class="form-control">
        <TextEdit ref="input" value={this.state.input} />
        <Button onClick={this.onBtnChangeClick}>Change</Button>
      </Widget>
      <TextView class="item">
        Please click button to test progress
        ({this.state.value / this.state.total * 100 + '%'})
      </TextView>
      <Progress class="item" value={this.state.value} total={this.state.total} />
      <Widget class="button-group">
        <Button onClick={this.onBtnMinusClick}>-</Button>
        <Button onClick={this.onBtnPlusClick}>+</Button>
      </Widget>
    </Widget>)
  }

  onBtnChangeClick() {
    this.state.text = this.refs.input.value
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
