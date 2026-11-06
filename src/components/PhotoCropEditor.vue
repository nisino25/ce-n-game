<template>
    <div>
        <!-- ドラッグで位置、バーで拡大。カードの写真枠（138×123）と同じ比率で見せる -->
        <div class="mx-auto w-[220px]">
            <canvas
                ref="canvas"
                width="276"
                height="246"
                class="block w-full rounded-lg bg-white border border-emerald-200 touch-none cursor-move"
                @pointerdown="onDown"
                @pointermove="onMove"
                @pointerup="onUp"
                @pointercancel="onUp"
            ></canvas>
        </div>
        <div class="mt-3 flex items-center gap-2">
            <span class="text-xs">🔍</span>
            <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                :value="edit.zoom"
                class="flex-1"
                @input="onZoom"
                @change="emitChange"
            >
            <button type="button" class="text-xs underline whitespace-nowrap" @click="reset">{{ $t('まんなかに もどす', 'Reset to center') }}</button>
        </div>
    </div>
</template>

<script>
import { cropRect } from "@/utils/creatureCard.js";

// ■写真の位置と拡大を編集する部品。変更が終わると { zoom, cx, cy } を change で知らせる
// 写真そのものは作り直さない（作り直しは、呼び出し側が compressCardImage で行う）
export default {
    name: "PhotoCropEditor",

    props: {
        src: { type: String, required: true },
        // 最初に表示する位置・拡大（親が持っている編集の内容から始めるため）
        initialEdit: { type: Object, default: null }
    },

    emits: ["change"],

    data() {
        return {
            img: null, // 読み込んだ写真（描画だけに使う）
            edit: { zoom: 1, cx: 0.5, cy: 0.5 },
            drag: null
        };
    },

    watch: {
        src: {
            immediate: true,
            handler() {
                this.edit = this.initialEdit ? { ...this.initialEdit } : { zoom: 1, cx: 0.5, cy: 0.5 };
                this.load();
            }
        }
    },

    methods: {
        load() {
            const src = this.src;
            if (!src) return;
            const img = new Image();
            img.onload = () => {
                if (src !== this.src) return; // もっと新しい写真に切り替わっていたら捨てる
                this.img = img;
                this.draw();
            };
            img.src = src;
        },

        draw() {
            const canvas = this.$refs.canvas;
            const img = this.img;
            if (!canvas || !img) return;
            const { sx, sy, sw, sh } = cropRect(img.naturalWidth, img.naturalHeight, this.edit);
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        },

        onDown(e) {
            this.drag = { x: e.clientX, y: e.clientY, cx: this.edit.cx, cy: this.edit.cy };
            e.currentTarget.setPointerCapture(e.pointerId);
        },

        // ドラッグで写真を動かす（指の動きと同じだけ、写真がついてくる）
        onMove(e) {
            const drag = this.drag;
            const canvas = this.$refs.canvas;
            const img = this.img;
            if (!drag || !canvas || !img) return;

            const rect = canvas.getBoundingClientRect();
            const { sw, sh } = cropRect(img.naturalWidth, img.naturalHeight, this.edit);
            // 切り取りの範囲が、写真の外へはみ出さないように、中心を止める
            const halfX = sw / (2 * img.naturalWidth);
            const halfY = sh / (2 * img.naturalHeight);
            const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

            this.edit = {
                ...this.edit,
                cx: clamp(drag.cx - ((e.clientX - drag.x) / rect.width) * (sw / img.naturalWidth), halfX, 1 - halfX),
                cy: clamp(drag.cy - ((e.clientY - drag.y) / rect.height) * (sh / img.naturalHeight), halfY, 1 - halfY)
            };
            this.draw();
        },

        onUp() {
            if (!this.drag) return;
            this.drag = null;
            this.emitChange();
        },

        // バーで拡大するとき：拡大した分だけ、中心がはみ出さないように直してから描く
        onZoom(e) {
            const zoom = Number(e.target.value);
            const img = this.img;
            let { cx, cy } = this.edit;
            if (img) {
                const { sw, sh } = cropRect(img.naturalWidth, img.naturalHeight, { zoom, cx, cy });
                const halfX = sw / (2 * img.naturalWidth);
                const halfY = sh / (2 * img.naturalHeight);
                cx = Math.min(Math.max(cx, halfX), 1 - halfX);
                cy = Math.min(Math.max(cy, halfY), 1 - halfY);
            }
            this.edit = { zoom, cx, cy };
            this.draw();
        },

        reset() {
            this.edit = { zoom: 1, cx: 0.5, cy: 0.5 };
            this.draw();
            this.emitChange();
        },

        emitChange() {
            this.$emit("change", { ...this.edit });
        }
    }
};
</script>
