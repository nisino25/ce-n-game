export function createAvatarCode(parts){

    return (
        String(parts.env).padStart(2,'0') +
        String(parts.clo).padStart(2,'0') +
        String(parts.head).padStart(2,'0') +
        String(parts.mouth).padStart(2,'0') +
        String(parts.eyes).padStart(2,'0') +
        String(parts.top).padStart(2,'0')
    )

}