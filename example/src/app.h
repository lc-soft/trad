#ifndef MY_APP_H
#define MY_APP_H

LCUI_BEGIN_HEADER

typedef struct MyAppRec_ {
	char *title;
	LCUI_Widget progress;
	LCUI_Widget minus;
	LCUI_Widget plus;
} MyAppRec, *MyApp;

LCUI_API MyApp MyApp_new(void);

LCUI_API int MyApp_run(MyApp _this);

LCUI_END_HEADER

#endif
