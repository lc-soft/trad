#ifndef MY_APP_PROGRESS_H
#define MY_APP_PROGRESS_H

LCUI_BEGIN_HEADER

typedef struct ProgressRec_ {
    LCUI_Widget bar;
    int _total;
    int _value;
} ProgressRec, *Progress;

LCUI_API void Progress_setTotal(LCUI_Widget w, int value);

LCUI_API int Progress_getTotal(LCUI_Widget w);

LCUI_API void Progress_setValue(LCUI_Widget w, int value);

LCUI_API int Progress_getValue(LCUI_Widget w);

LCUI_API void Progress_update(LCUI_Widget w);

LCUI_API void LCUIWidget_AddProgress(void);

LCUI_END_HEADER

#endif
