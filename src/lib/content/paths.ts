import path from 'node:path';

/**
 * vault 의 뿌리. 글도 사진도 전부 이 아래에 있다.
 *
 * parse.ts 가 아니라 여기 있는 이유는 images.ts 도 이 값을 쓰기 때문이다 —
 * parse 가 첫 이미지를 뽑으려고 images 를 부르고 images 가 다시 parse 에서
 * 경로를 가져오면 두 파일이 서로를 붙든다. 경로 하나만 떼어 두면 그 고리가
 * 애초에 생기지 않는다.
 */
export const CONTENT_DIR = path.join(process.cwd(), 'src', 'content');
