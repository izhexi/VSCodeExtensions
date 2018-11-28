"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getWidgetData(widgetName, fileName) {
    return `import 'package:flutter/material.dart';
import './${fileName}_view.dart';

class ${widgetName} extends StatefulWidget {
  
  @override
  ${widgetName}View createState() => new ${widgetName}View();
}
  
`;
}
exports.default = getWidgetData;
//# sourceMappingURL=templateWidget.js.map