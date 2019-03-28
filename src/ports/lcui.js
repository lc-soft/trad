const LCUI = {
  type: 'module',
  source: 'LCUI',
  includes: [
    '<LCUI_Build.h>',
    '<LCUI/LCUI.h>'
  ],
  exports: {
    App: {
      type: 'class'
    }
  }
}

const LCUIWidget = {
  type: 'module',
  source: 'LCUI',
  includes: [
    '<LCUI_Build.h>',
    '<LCUI/LCUI.h>',
    '<LCUI/gui/widget.h>'
  ],
  exports: {
    Widget: {
      type: 'class',
      includes: ['<LCUI/gui/widget.h>']
    },
    Button: {
      type: 'class',
      includes: ['<LCUI/gui/widget/button.h>']
    },
    TextView: {
      type: 'class',
      includes: ['<LCUI/gui/widget/textview.h>']
    }
  }
}

function install(ports) {
  ports['lcui'] = LCUI
  ports['lcui/widget'] = LCUIWidget
}

module.exports = { install }
