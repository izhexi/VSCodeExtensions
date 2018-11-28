"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getWidgetViewData(widgetName, fileName) {
    return `import 'package:flutter/material.dart';
import './${fileName}_view_model.dart';
  
class ${widgetName}View extends ${widgetName}ViewModel {
    
  @override
  Widget build(BuildContext context) {
    
    // Replace this with your build function
    return Text('Just a placeholder');
  }
}

`;
}
exports.default = getWidgetViewData;
//# sourceMappingURL=templateWidgetView.js.map