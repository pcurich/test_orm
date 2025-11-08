import { environment } from '@env/environment';
import { TRACK_FILTER_TOKEN, TRACK_REPOSITORY_TOKEN } from "../tokens/track.tokens";
import { TrackFilterService } from "../services/track-filter.service";
import { TrackHttpRepository } from "../repositories/track-http.repository";
import { TrackMockRepository } from "../repositories/track-mock.repository";

export const TRACK_PROVIDERS = [
  {
    provide: TRACK_REPOSITORY_TOKEN,
    // evaluate once and log for easier debugging
    useClass: (() => {
      let localMock = localStorage.getItem(environment.mockKey);
      const useMock = localMock ? (JSON.parse(localMock))['useMock'] : false;
      // eslint-disable-next-line no-console
      console.log('[TRACK_PROVIDERS] useMock =', useMock, 'localStorage(useMock)=', localStorage.getItem('useMock'));
      return useMock ? TrackMockRepository : TrackHttpRepository;
    })()
  },
  {
    provide: TRACK_FILTER_TOKEN,
    useClass: TrackFilterService
  }
];
