import { Provider } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpPanelApi } from './http-panel-api';
import { HttpPortalApi } from './http-portal-api';
import { MockPanelApi } from './mock/mock-panel-api';
import { MockPortalApi } from './mock/mock-portal-api';
import { PanelApi } from './panel-api';
import { PortalApi } from './portal-api';

/** The single switch between the in-browser demo and the real services. */
export function provideApis(): Provider[] {
  return environment.useMockApi
    ? [{ provide: PortalApi, useClass: MockPortalApi }, { provide: PanelApi, useClass: MockPanelApi }]
    : [{ provide: PortalApi, useClass: HttpPortalApi }, { provide: PanelApi, useClass: HttpPanelApi }];
}
