import { Injectable } from '@angular/core';
import {ActionButton, ButtonType, DownloadButtonType} from '../../../../../assets/data/configData';
import { AppResponse } from '@openchannel/angular-common-services';
import { get } from 'lodash';

@Injectable({
    providedIn: 'root',
})
export class ButtonActionService {
    readonly hideButtonsWithoutOwnership: ButtonType[] = ['install', 'download'];

    canBeShow(app: AppResponse, buttons: ActionButton[]): ActionButton[] {

        const availableButtons = buttons.filter(button => this.defaultButtonFilter(app, button));

        if(!app?.model?.length || (app.model[0].type === 'free') || this.isActiveOwnership(app)) {
            // 1. when price models is empty.
            // 2. when first price model with 'free' type.
            // 3. when user have ownership (bought).
            return availableButtons;
        } else {
            const buyButton = buttons.find(button => button.type === 'purchase');
            // 1. always show 'Buy' button.
            // 2. show other buttons without required ownership.
            return [buyButton, ...availableButtons.filter(button => !this.hideButtonsWithoutOwnership.includes(button.type))];
        }
    }

    private defaultButtonFilter(app: AppResponse, button: ActionButton): boolean {
        if (button.showForAppTypes?.length > 0 && !button.showForAppTypes.includes(app.type)) {
            return false;
        }
        switch (button.type) {
            case 'form':
                return true;
            case 'install':
                return !this.isActiveOwnership(app);
            case 'uninstall':
                return this.isActiveOwnership(app);
            case 'download':
                return this.canBeShowDownloadButton(app, button);
            case 'purchase':
            default:
                return false;
        }
    }

    private isActiveOwnership(app: any): boolean {
        return app?.ownership?.ownershipStatus === 'active';
    }

    private canBeShowDownloadButton(app: any, button: DownloadButtonType): boolean {
        return !!get(app, button.pathToFile);
    }
}
