class LCUIAdapter {
  constructor() {
    this.includes = [
      '<LCUI_Build.h>',
      '<LCUI/LCUI.h>'
    ]
  }
}

class LCUIWidgetAdapter {
  constructor() {
    this.includes = [
      '<LCUI_Build.h>',
      '<LCUI/LCUI.h>',
      '<LCUI/gui/widget.h>'
    ]
    this.exports = {
      Widget: {
        includes: ['<LCUI/gui/widget.h>']
      },
      Button: {
        includes: ['<LCUI/gui/widget/button.h>']
      },
      TextView: {
        includes: ['<LCUI/gui/widget/textview.h>']
      }
    }
  }
}

function install(compiler) {
  compiler.adapters.lcui = new LCUIAdapter()
  compiler.adapters['lcui/widget'] = new LCUIWidgetAdapter()
}

module.exports = { install }
