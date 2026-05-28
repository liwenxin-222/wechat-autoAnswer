

declare const $autox: {
    registerHandler(name: string,
        handler: (data: string,
            callback?: (data: string) => void
        ) => void): void
    callHandler(name: string, data?: string, callback?: (data: string) => void): void
}
function isAutox(): boolean {
    return typeof $autox !== 'undefined';
}

export function registerHandler(name: string, handler: (data: string, callback?: (data: string) => void) => void) {
    if (isAutox()) {
        $autox.registerHandler(name, handler)
    } else {
        console.warn('AutoX is not supported in this environment')
    }
}

export function callHandler(name: string, data?: string, callback?: (data: string) => void) {
    if (isAutox()) {
        $autox.callHandler(name, data, callback)
    } else {
        console.warn('AutoX is not supported in this environment')
    }
}