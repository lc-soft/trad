import LCUI from 'lcui'
import { Widget, Button, TextView } from 'lcui/widgets'
import Progress from './components/progress'

interface MyApp {
  title: string
  progress: Progress
  minus: Button
  plus: Button
}

class MyApp extends LCUI.App {
  title = 'My First LCUI App!'

  template() {
    return <Widget>
      <TextView>Hello, World!</TextView>
      <TextView>Please click button to test progress</TextView>
      <Progress ref="progress" />
      <Button ref="minus">-</Button>
      <Button ref="plus">+</Button>
    </Widget>
  }

  created() {
    this.progress.total = 100
    this.progress.value = 50
  }

  onMinusClick() {
    if (this.progress.value > 0) {
      this.progress.value -= 10
    }
  }

  onPlusClick() {
    if (this.progress.value < 100) {
      this.progress.value += 10
    }
  }
}

export default MyApp
