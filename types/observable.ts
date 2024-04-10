export type Observable<T> = {
    subscribe: (observer: Observer<T>) => Subscription;
    closed: boolean;
};

export type Observer<T> = {
    next: (value: T) => void;
    error: (error: Error) => void;
    complete: () => void;
};

export type Subscription = {
    unsubscribe: () => void;
};