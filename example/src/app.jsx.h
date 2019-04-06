#ifdef __cplusplus
extern "C" {
#endif

typedef struct MyAppRec_* MyApp;


MyApp MyApp_OnStateTextChanged(void* arg);
MyApp MyApp_OnStateInputChanged(void* arg);
MyApp MyApp_OnStateValueChanged(void* arg);
MyApp MyApp_OnStateTotalChanged(void* arg);
void MyApp_Created(MyApp _this);
LCUI_Widget MyApp_Template(MyApp _this);
void MyApp_OnBtnChangeClick(MyApp _this);
void MyApp_OnBtnMinusClick(MyApp _this);
void MyApp_OnBtnPlusClick(MyApp _this);
MyApp MyApp_New();
MyApp MyApp_Delete(MyApp _this);

#ifdef __cplusplus
}
#endif
