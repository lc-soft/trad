#include <LCUI_Build.h>
#include <LCUI/LCUI.h>
#include <LCUI/gui/widget.h>
#include <LCUI/gui/widget/textview.h>
#include <LCUI/gui/widget/button.h>
#include "app.h"
#include "components/progress.h"

static void MyApp_InitTitle(MyApp _this)
{
	LCUI_Widget root;

	Widget_SetTitle(root, _this->title);
}

static MyApp MyApp_constructor(void)
{
	MyApp _this = malloc(sizeof(MyAppRec));

	_this->title = strdup("my First LCUI App!");
	return _this;
}

static LCUI_Widget MyApp_template(MyApp _this)
{
	LCUI_Widget wrapper = LCUIWidget_New(NULL);

	LCUI_Widget textview_1 = LCUIWidget_New("textview");
	Widget_SetText(textview_1, "Hello, World!");
	Widget_Append(wrapper, textview_1);

	LCUI_Widget textview_2 = LCUIWidget_New("textview");
	Widget_SetText(textview_1, "Please click button to test progress");
	Widget_Append(wrapper, textview_2);

	LCUI_Widget progress_progress = LCUIWidget_New("progress");
	_this->progress = progress_progress;
	Widget_Append(wrapper, progress_progress);

	LCUI_Widget button_minus = LCUIWidget_New("button");
	_this->minus = button_minus;
	Widget_SetText(textview_1, "-");
	Widget_Append(wrapper, button_minus);

	LCUI_Widget button_plus = LCUIWidget_New("button");
	_this->plus = button_plus;
	Widget_SetText(textview_1, "+");
	Widget_Append(wrapper, button_plus);

	return wrapper;
}

static void MyApp_onMinusClick(LCUI_Widget w, LCUI_WidgetEvent e, void *arg)
{
	MyApp _this = e->data;
	int progress_value = Progress_getValue(_this->progress);

	if (progress_value > 0) {
		progress_value -= 10;
		Progress_setValue(_this->progress, progress_value);
	}
}

static void MyApp_onPlusClick(LCUI_Widget w, LCUI_WidgetEvent e, void *arg)
{
	MyApp _this = e->data;
	int progress_value = Progress_getValue(_this->progress);

	if (progress_value < 100) {
		progress_value += 10;
		Progress_setValue(_this->progress, progress_value);
	}
}

static void MyApp_initEventHandlers(MyApp _this)
{
	Widget_BindEvent(_this->minus, "click", MyApp_onMinusClick, _this, NULL);
	Widget_BindEvent(_this->plus, "click", MyApp_onPlusClick, _this, NULL);
}

static void MyApp_created(MyApp _this)
{
	Progress_setTotal(_this->progress, 100);
	Progress_setValue(_this->progress, 50);
}

MyApp MyApp_new(void)
{
	LCUI_Widget root;
	LCUI_Widget wrapper;
	MyApp _this = MyApp_constructor();

	root = LCUIWidget_GetRoot();
	wrapper = MyApp_template(_this);
	Widget_Append(root, wrapper);
	Widget_Unwrap(root);

	MyApp_initEventHandlers(_this);
	MyApp_created(_this);
	return _this;
}

void MyApp_free(MyApp _this)
{
	free(_this->title);
	free(_this);
}

int MyApp_run(MyApp _this)
{
	int ret = LCUI_Main();
	MyApp_free(_this);
	return ret;
}
