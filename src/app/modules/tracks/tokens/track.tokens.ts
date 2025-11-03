import { InjectionToken } from "@angular/core";
import { ITrackRepository } from "../interfaces/track-repository.interface";
import { ITrackFilter } from "../interfaces/track-filter.interface";

export const TRACK_REPOSITORY_TOKEN = new InjectionToken<ITrackRepository>('TrackRepository');
export const TRACK_FILTER_TOKEN = new InjectionToken<ITrackFilter>('TrackFilter');
