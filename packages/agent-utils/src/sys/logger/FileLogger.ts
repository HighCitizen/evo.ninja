import { Workspace } from "../workspaces";
import { ILogger } from "./Logger";

import path from "path-browserify";

export class FileLogger implements ILogger {
  constructor(
    private _filePath: string,
    private _workspace: Workspace
  ) {
    // Make the log directory if it doesn't exist
    const logDir = path.dirname(this._filePath);
    if (!_workspace.existsSync(logDir)) {
      _workspace.mkdirSync(logDir, { recursive: true });
    }

    // Delete the file if it exists
    if (_workspace.existsSync(this._filePath)) {
      _workspace.rmSync(this._filePath);
    }
  }

  info(info: string): void {
    this._workspace.appendFileSync(this._filePath, info + "\n\n");
  }

  notice(msg: string): void {
    this.info(msg + "\n  \n");
  }

  success(msg: string): void {
    this.info(msg + "\n  \n");
  }

  warning(msg: string): void {
    this.info(msg + "\n  \n");
  }

  error(msg: string): void {
    this.info(msg + "\n  \n");
  }
}
