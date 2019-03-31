import ctypes from 'trad'
import LCUI from 'trad/lcui'
import {
  Widget,
  Button,
  TextView,
  TextEdit
} from 'trad/lcui/widget'
import Progress from './components/progress'

class MyApp extends LCUI.App {
  constructor() {
    super()
  
    // Define internal state data
    this.state = {
      text: ctypes.string,
      input: ctypes.string,
      value: ctypes.unsigned,
      total: ctypes.unsigned
    }
  }

  created() {
    // Initialize state
    this.state.text = 'Hello, World!'
    this.state.input = 'Hello, World!'
    this.state.value = 50
    this.state.total = 100
  }

  render() {
    return (<Widget>
      <TextView>{state.text}</TextView>
      <TextEdit value={state.input} />
      <Button onClick={changeText}>Change</Button>
      <TextView>Please click button to test progress</TextView>
      <Progress value={state.value} total={state.total} />
      <Button onClick={onBtnMinusClick}>-</Button>
      <Button onClick={onBtnPlusClick}>>+</Button>
    </Widget>)
  }

  created() {
    this.state.total = 100
    this.state.value = 50
  }

  onBtnChangeClick() {
    this.state.text = this.state.input
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

export default MyApp
