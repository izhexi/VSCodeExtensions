"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getWidgetViewModelData(widgetName, fileName) {
    return `import 'package:flutter/material.dart';
import './${fileName}.dart';

abstract class ${widgetName}ViewModel extends State<${widgetName}> {
  // Add your state and logic here
}
`;
}
exports.default = getWidgetViewModelData;
//# sourceMappingURL=templateWidgetViewModel.js.map