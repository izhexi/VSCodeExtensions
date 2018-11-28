'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionId = 'humao.rest-client';
exports.AiKey = 'ad746e27-4a36-441c-8b94-5db178f81ae3';
exports.CSSFileName = 'rest-client.css';
exports.CSSFolderName = 'styles';
exports.ScriptFileName = 'main.js';
exports.ScriptsFolderName = 'scripts';
exports.ImagesFolderName = 'images';
exports.IconFileName = 'rest_icon.png';
exports.ExtensionFolderName = '.rest-client';
exports.HistoryFileName = 'history.json';
exports.CookieFileName = 'cookie.json';
exports.EnvironmentFileName = 'environment.json';
exports.DefaultResponseDownloadFolderName = 'responses/raw';
exports.DefaultResponseBodyDownloadFolderName = 'responses/body';
exports.HistoryItemsMaxCount = 50;
exports.NoEnvironmentSelectedName = 'c0cfe680-4fcd-4b71-a4ba-8cfaee57680a';
exports.TimeStampVariableName = "$timestamp";
exports.TimeStampVariableDescription = "Add a number of milliseconds between 1970/1/1 UTC Time and now. \
 You can also provide the offset with current time in the format {{$timestamp number string}}";
exports.DateTimeVariableName = "$datetime";
exports.DateTimeVariableNameDescription = "Add a datetime string in either ISO8601 or RFC1322 format";
exports.GuidVariableName = "$guid";
exports.GuidVariableDescription = "Add a RFC 4122 v4 UUID";
exports.RandomIntVariableName = "$randomInt";
exports.RandomIntDescription = "Returns a random integer between min (included) and max (excluded)";
exports.AzureActiveDirectoryVariableName = "$aadToken";
exports.AzureActiveDirectoryDescription = "Prompts to sign in to Azure AD and adds the token to the request";
/**
 * NOTE: The client id represents an AAD app people sign in to. The client id is sent to AAD to indicate what app
 * is requesting a token for the user. When the user signs in, AAD shows the name of the app to confirm the user is
 * authorizing the right app to act on their behalf. We're using Visual Studio Code's client id since that is the
 * overarching app people will think of when they are signing in.
 */
exports.AzureActiveDirectoryClientId = "aebc6443-996d-45c2-90f0-388ff96faa56";
exports.AzureActiveDirectoryForceNewOption = "new";
exports.AzureActiveDirectoryDefaultTenantId = "common";
exports.AzureActiveDirectoryDefaultDisplayName = "Default Directory";
exports.AzureClouds = {
    // default cloud must be first
    public: {
        aad: "https://login.microsoftonline.com/",
        arm: "https://management.azure.com/",
    },
    cn: {
        aad: "https://login.chinacloudapi.cn/",
        arm: "https://management.chinacloudapi.cn/",
    },
    de: {
        aad: "https://login.microsoftonline.de/",
        arm: "https://management.microsoftazure.de/",
    },
    us: {
        aad: "https://login.microsoftonline.us/",
        arm: "https://management.usgovcloudapi.net/",
    },
    ppe: {
        aad: "https://login.windows-ppe.net/",
        arm: "https://api-dogfood.resources.windows-int.net/",
        armAudience: "https://management.azure.com/",
    },
};
exports.CommentIdentifiersRegex = /^\s*(#|\/{2})/;
exports.FileVariableDefinitionRegex = /^\s*@([^\s=]+)\s*=\s*(.+?)\s*$/;
exports.RequestVariableDefinitionWithNameRegexFactory = (name, flags) => new RegExp(`^\\s*(?:#{1,}|\\/{2,})\\s+@name\\s+(${name})\\s*$`, flags);
exports.RequestVariableDefinitionRegex = exports.RequestVariableDefinitionWithNameRegexFactory("\\w+", "m");
exports.LineSplitterRegex = /\r?\n/g;
//# sourceMappingURL=constants.js.map