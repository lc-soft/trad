#ifdef __cplusplus
extern "C" {
#endif

typedef struct MyAppRec_* MyApp;
void MyApp_OnStateTextChanged(LCUI_Object text, void *arg);
void MyApp_OnStateInputChanged(LCUI_Object input, void *arg);
void MyApp_OnStateValueChanged(LCUI_Object value, void *arg);
void MyApp_OnStateTotalChanged(LCUI_Object total, void *arg);
void MyApp_Created(LCUI_Widget w);
LCUI_Widget MyApp_Template(LCUI_Widget w);
void MyApp_OnBtnChangeClick(LCUI_Widget w);
void MyApp_OnBtnMinusClick(LCUI_Widget w);
void MyApp_OnBtnPlusClick(LCUI_Widget w);

#ifdef __cplusplus
}
#endif
