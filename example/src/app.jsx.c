#include <LCUI_Build.h>
#include <LCUI/LCUI.h>
#include <LCUI/gui/widget.h>
#include <LCUI/gui/widget/button.h>
#include <LCUI/gui/widget/textview.h>
#include <LCUI/gui/widget/textedit.h>
#include <LCUI/timer.h>
#include "components\progress.jsx.h"
#include "app.jsx.h"

typedef struct MyAppRec_ MyAppRec;
typedef struct MyAppRec_* MyApp;
typedef struct MyAppStateRec_ MyAppStateRec;
typedef struct MyAppRefsRec_ MyAppRefsRec;

struct MyAppStateRec_ {
        LCUI_ObjectRec text;
        LCUI_ObjectRec input;
        LCUI_ObjectRec value;
        LCUI_ObjectRec total;
};

struct MyAppRefsRec_ {
        LCUI_Widget _textedit;
        LCUI_Widget _button;
        LCUI_Widget _button_1;
        LCUI_Widget _button_2;
};

struct MyAppRec_ {
        MyAppStateRec state;
        unsigned state_changes;
        LCUI_Widget widget;
        MyAppRefsRec refs;
};


static void MyApp_Destructor(MyApp);
static void MyApp_Constructor(MyApp);
static void MyApp_OnStateTextChanged(LCUI_Object, void*);
static void MyApp_OnStateInputChanged(LCUI_Object, void*);
static void MyApp_OnStateValueChanged(LCUI_Object, void*);
static void MyApp_OnStateTotalChanged(LCUI_Object, void*);
static void MyApp_Created(MyApp);
static void MyApp_OnBtnChangeClick(MyApp);
static void MyApp_OnBtnMinusClick(MyApp);
static void MyApp_OnBtnPlusClick(MyApp);
static LCUI_Widget MyApp_Template(MyApp);
static void MyApp_AutoUpdate(MyApp);
static void MyApp_Update(MyApp);
static int MyApp_Run(MyApp);
static MyApp MyApp_New();
static void MyApp_Delete(MyApp);

static void MyApp_Destructor(MyApp _this)
{
        Object_Destroy(&_this->state.text);
        Object_Destroy(&_this->state.input);
        Object_Destroy(&_this->state.value);
        Object_Destroy(&_this->state.total);
}

static void MyApp_Constructor(MyApp _this)
{
        LCUI_Init();
        _this->state_changes = 1;
        String_Init(&_this->state.text, NULL);
        String_Init(&_this->state.input, NULL);
        Number_Init(&_this->state.value, 0);
        Number_Init(&_this->state.total, 0);
        Object_Watch(&_this->state.text, MyApp_OnStateTextChanged, NULL);
        Object_Watch(&_this->state.input, MyApp_OnStateInputChanged, NULL);
        Object_Watch(&_this->state.value, MyApp_OnStateValueChanged, NULL);
        Object_Watch(&_this->state.total, MyApp_OnStateTotalChanged, NULL);
        MyApp_Template(_this);
        MyApp_Update(_this);
}

static void MyApp_OnStateTextChanged(LCUI_Object text, void *arg)
{
        MyApp _this;

        _this = arg;
        ++_this->state_changes;
}

static void MyApp_OnStateInputChanged(LCUI_Object input, void *arg)
{
        MyApp _this;

        _this = arg;
        ++_this->state_changes;
        Widget_SetAttributeEx(_this->refs._textedit, "value", input, 0, NULL);
}

static void MyApp_OnStateValueChanged(LCUI_Object value, void *arg)
{
        MyApp _this;

        _this = arg;
        ++_this->state_changes;
}

static void MyApp_OnStateTotalChanged(LCUI_Object total, void *arg)
{
        MyApp _this;

        _this = arg;
        ++_this->state_changes;
}

static void MyApp_Created(MyApp _this)
{
        String_SetValue(&_this->state.text, "Hello, World!");
        String_SetValue(&_this->state.input, "Hello, World!");
        Number_SetValue(&_this->state.value, 50);
        Number_SetValue(&_this->state.total, 100);
}

static void MyApp_OnBtnChangeClick(MyApp _this)
{
        Object_Operate(&_this->state.text, "=", &_this->state.input);
}

static void MyApp_OnBtnMinusClick(MyApp _this)
{
        LCUI_ObjectRec _number;

        Number_Init(&_number, 0);
        if (Object_Compare(&_this->state.value, &_number) > 0)
        {
                Number_SetValue(&_this->state.value, 10);
        }

        Object_Destroy(&_number);
}

static void MyApp_OnBtnPlusClick(MyApp _this)
{
        LCUI_ObjectRec _number;

        Number_Init(&_number, 100);
        if (Object_Compare(&_this->state.value, &_number) < 0)
        {
                Number_SetValue(&_this->state.value, 10);
        }

        Object_Destroy(&_number);
}

static LCUI_Widget MyApp_Template(MyApp _this)
{
        LCUI_Widget textview;
        LCUI_Widget textview_1;

        /* JSXText ignored */
        textview = LCUIWidget_New("textview");
        /* JSXText ignored */
        _this->refs._textedit = LCUIWidget_New("textedit");
        /* JSXText ignored */
        _this->refs._button = LCUIWidget_New("button");
        /* JSXElementAttribute ignored */
        /* JSXText ignored */
        /* JSXText ignored */
        textview_1 = LCUIWidget_New("textview");
        /* JSXText ignored */
        /* JSXText ignored */
        _this->refs._button_1 = LCUIWidget_New("button");
        /* JSXElementAttribute ignored */
        /* JSXText ignored */
        /* JSXText ignored */
        _this->refs._button_2 = LCUIWidget_New("button");
        /* JSXElementAttribute ignored */
        /* JSXText ignored */
        /* JSXText ignored */
        Widget_Append(_this->widget, textview);
        Widget_Append(_this->widget, _this->refs._textedit);
        Widget_Append(_this->widget, _this->refs._button);
        Widget_Append(_this->widget, textview_1);
        Widget_Append(_this->widget, _this->refs._button_1);
        Widget_Append(_this->widget, _this->refs._button_2);
        return _this->widget;
}

static void MyApp_AutoUpdate(MyApp _this)
{
        MyApp_Update(_this);
        LCUI_SetTimeout(0, MyApp_Update, _this);
}

static void MyApp_Update(MyApp _this)
{
        if (_this->state_changes < 1)
        {
                return;
        }
        _this->state_changes = 0;
}

static int MyApp_Run(MyApp _this)
{
        MyApp_AutoUpdate(_this);
        return LCUI_Main();
}

static MyApp MyApp_New()
{
        MyApp _this;
        _this = malloc(sizeof(MyAppRec));
        if (_this == NULL)
        {
                return NULL;
        }
        MyApp_Constructor(_this);
        return _this;
}

static void MyApp_Delete(MyApp _this)
{
        MyApp_Destructor(_this);
        free(_this);
}


int main()
{
        MyApp my_app;

        my_app = MyApp_New();
        return MyApp_Run(my_app);
}
