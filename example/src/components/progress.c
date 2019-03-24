#include <LCUI_Build.h>
#include <LCUI/LCUI.h>
#include <LCUI/gui/widget.h>
#include "progress.h"

static LCUI_WidgetPrototype progress_prototype;

static Progress getSelfData(LCUI_Widget w)
{
	return Widget_GetData(w, progress_prototype);
}

static void Progress_created(LCUI_Widget w)
{
	Progress _this = getSelfData(w);

	Progress_setTotal(w, 100);
	Progress_setValue(w, 0);
}

static void Progress_beforeDestroy(LCUI_Widget w)
{

}

static void Progress_template(LCUI_Widget w)
{
	Progress _this = getSelfData(w);

	Widget_AddClass(w, "progress");

	_this->bar = LCUIWidget_New(NULL);
	Widget_AddClass(_this->bar, "bar");

	Widget_Append(w, _this->bar);
}

static void Progress_constructor(LCUI_Widget w)
{
	Widget_AddData(w, progress_prototype, sizeof(ProgressRec));
}

static void Progress_init(LCUI_Widget w)
{
	Progress_constructor(w);
	Progress_template(w);
	Progress_created(w);
}

void Progress_setTotal(LCUI_Widget w, int value)
{
	Progress _this = getSelfData(w);

	_this->_total = value;
	Progress_update(w);
}

int Progress_getTotal(LCUI_Widget w)
{
	Progress _this = getSelfData(w);

	return _this->_total;
}

void Progress_setValue(LCUI_Widget w, int value)
{
	Progress _this = getSelfData(w);

	Progress_update(w);
}

int Progress_getValue(LCUI_Widget w)
{
	Progress _this = getSelfData(w);

	return _this->_value;
}

void Progress_update(LCUI_Widget w)
{
	Progress _this = getSelfData(w);
	int percentage = _this->_value * 100 / _this->_total;

	do {
		LCUI_Style _style_width;
		char _style_width_str[256] = { 0 };

		_style_width = Widget_GetStyle(w, key_width);
		ParseStyle(_style_width, _style_width_str);
		Widget_AddTaskByStyle(w, key_width);
	} while (0);
}

void LCUIWidget_AddProgress(void)
{
	progress_prototype->init = Progress_init;
	progress_prototype->destroy = Progress_beforeDestroy;
}
