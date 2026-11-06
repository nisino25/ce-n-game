<template>
    <!-- 写真を整えるモーダル（スキャンの判定前・登録前、図鑑の写真の編集で共通に使う） -->
    <div
        class="fixed inset-0 z-[10050] bg-black/60 flex items-center justify-center p-4"
        @click.self="$emit('close')"
    >
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-5">
            <p class="text-sm font-bold text-emerald-800">📷 {{ $t('しゃしんを ととのえる', 'Adjust the photo') }}</p>
            <p class="text-xs text-emerald-600 mb-3">{{ $t('ドラッグで いちを うごかす・バーで ちかづける', 'Drag to move. Use the slider to zoom in.') }}</p>

            <slot name="note"></slot>

            <PhotoCropEditor :src="src" :initial-edit="initialEdit" @change="$emit('change', $event)" />

            <slot name="footer">
                <button
                    type="button"
                    class="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl"
                    @click="$emit('close')"
                >
                    {{ $t('きめる', 'Done') }}
                </button>
            </slot>
        </div>
    </div>
</template>

<script>
import PhotoCropEditor from "@/components/PhotoCropEditor.vue";

export default {
    name: "PhotoAdjustModal",

    components: { PhotoCropEditor },

    props: {
        src: { type: String, required: true },
        initialEdit: { type: Object, default: null }
    },

    emits: ["change", "close"]
};
</script>
