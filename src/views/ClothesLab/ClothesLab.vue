<template>
    <div class="min-h-screen bg-gray-100 py-8 px-4">
        <div class="max-w-6xl mx-auto">

            <header class="bg-white rounded-xl shadow p-5 mb-6">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <h1 class="text-xl font-bold">👗 {{ $t('ふくのラボ（確認用）', 'Outfit Lab (for checking)') }}</h1>
                    <button class="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg" @click="$router.push({ name: 'Home' })">🏠 {{ $t('モニタールームへ', 'Back to Monitor Room') }}</button>
                </div>
                <p class="text-sm text-gray-600 mt-2">
                    {{ $t('ふくを1つえらぶと、右に番号（id）と組み合わせが出ます。下の「コピー」を押して、そのまま送ってください。', 'Pick an outfit to see its id and combination on the right. Press Copy and send the text as it is.') }}
                </p>
            </header>

            <div class="grid lg:grid-cols-[1fr_380px] gap-6 items-start">

                <!-- ■ふく一覧：ほかの部分は右の欄で決めた組み合わせのまま、ふくだけ0〜47を並べる -->
                <section class="bg-white rounded-xl shadow p-4">
                    <h2 class="font-bold mb-1">{{ $t('ふく一覧（0〜47）', 'Outfits (0–47)') }}</h2>
                    <p class="text-xs text-gray-500 mb-3">{{ $t('表示の見方： 数字 ＝ ふくのid ／ 01B ＝ 絵の番号01・色のセットB', 'Label: number = outfit id / 01B = drawing 01, colour set B') }}</p>
                    <div class="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                        <button
                            v-for="item in outfits"
                            :key="item.id"
                            type="button"
                            class="rounded-lg border-2 p-1 text-center"
                            :class="item.id === selectedId ? 'border-sky-600 bg-sky-50' : 'border-transparent bg-gray-50 hover:border-gray-300'"
                            @click="selectedId = item.id"
                        >
                            <div class="aspect-square" v-html="item.svg"></div>
                            <div class="text-xs font-bold mt-1">#{{ item.id }} · {{ item.code }}</div>
                        </button>
                    </div>
                </section>

                <!-- ■えらんだふくの詳細：id・組み合わせ・コピー用テキスト -->
                <aside class="bg-white rounded-xl shadow p-5 lg:sticky lg:top-6">
                    <h2 class="font-bold mb-3">{{ $t('えらんだふく', 'Selected outfit') }}</h2>

                    <div class="w-44 aspect-square mx-auto" v-html="selectedSvg"></div>

                    <div class="mt-4 rounded-lg bg-gray-50 p-3 text-sm space-y-1">
                        <p><span class="font-bold">{{ $t('ふくのid', 'Outfit id') }}：</span>{{ selectedId }}（{{ selectedCode }}）</p>
                        <p><span class="font-bold">{{ $t('全体のid（12けた）', 'Full id (12 digits)') }}：</span><span class="font-mono">{{ fullId }}</span></p>
                    </div>

                    <table class="w-full text-sm mt-3">
                        <thead>
                            <tr class="text-left text-gray-500 border-b">
                                <th class="py-1">{{ $t('部分', 'Part') }}</th>
                                <th class="py-1">{{ $t('番号', 'No.') }}</th>
                                <th class="py-1">{{ $t('コード', 'Code') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="part in parts" :key="part.key" class="border-b" :class="part.key === 'clo' ? 'font-bold text-sky-700' : ''">
                                <td class="py-1">{{ $t(part.ja, part.en) }}</td>
                                <td class="py-1">{{ partValue(part.key) }}</td>
                                <td class="py-1 font-mono">{{ partCode(partValue(part.key)) }}</td>
                            </tr>
                        </tbody>
                    </table>

                    <button type="button" class="mt-4 w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg" @click="copyReport">
                        {{ copied ? $t('コピーしました', 'Copied!') : $t('コピー（送る用の文章）', 'Copy (text to send)') }}
                    </button>
                    <textarea ref="report" readonly rows="6" class="mt-2 w-full text-xs font-mono border rounded-lg p-2 bg-gray-50" :value="reportText"></textarea>

                    <!-- ■ほかの部分：ふくと組み合わせる相手を変えて、見え方を確かめる -->
                    <div class="mt-5">
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="font-bold">{{ $t('組み合わせる相手（ほかの部分）', 'Other parts (combine with)') }}</h3>
                            <div class="flex gap-2">
                                <button type="button" class="px-2 py-1 bg-blue-500 text-white rounded text-sm" @click="randomOthers">🎲 {{ $t('ランダム', 'Random') }}</button>
                                <button type="button" class="px-2 py-1 bg-gray-200 rounded text-sm" @click="resetOthers">{{ $t('リセット', 'Reset') }}</button>
                            </div>
                        </div>
                        <div v-for="part in otherParts" :key="part.key" class="flex items-center gap-2 mb-2">
                            <span class="w-20 text-sm font-semibold">{{ $t(part.ja, part.en) }}</span>
                            <button type="button" class="p-1 bg-gray-200 rounded" @click="shift(part.key, -1)">◀</button>
                            <input type="range" min="0" max="47" v-model.number="others[part.key]" class="flex-1">
                            <button type="button" class="p-1 bg-gray-200 rounded" @click="shift(part.key, 1)">▶</button>
                            <span class="w-14 text-right text-sm font-mono">{{ others[part.key] }} · {{ partCode(others[part.key]) }}</span>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    </div>
</template>

<script>
import { createAvatarCode } from '@/utils/avatarBuilder.js';

// ■番号(0〜47)→コード：0〜15はA、16〜31はB、32〜47はCの色セット（multiavatar.jsと同じ区切り）
const pad = (n) => String(n).padStart(2, '0');
const partCode = (n) => pad(n % 16) + 'ABC'[Math.floor(n / 16)];

export default {

    data(){
        return {
            parts: [
                { key:"env", ja:"はいけい", en:"Background" },
                { key:"clo", ja:"ふく", en:"Outfit" },
                { key:"head", ja:"はだの色", en:"Skin" },
                { key:"mouth", ja:"口", en:"Mouth" },
                { key:"eyes", ja:"目", en:"Eyes" },
                { key:"top", ja:"かみ", en:"Hair" }
            ],
            outfitIds: Array.from({ length: 48 }, (_, i) => i),
            selectedId: 0,
            // ■ふく以外の部分（ふくの見え方を確かめる相手）
            others: { env: 0, head: 0, mouth: 0, eyes: 0, top: 0 },
            copied: false
        }
    },

    computed:{
        otherParts(){
            return this.parts.filter(part => part.key !== 'clo');
        },
        selectedAvatar(){
            return { ...this.others, clo: this.selectedId };
        },
        selectedSvg(){
            return this.$buildAvatar(this.selectedAvatar);
        },
        selectedCode(){
            return partCode(this.selectedId);
        },
        fullId(){
            return createAvatarCode(this.selectedAvatar);
        },
        outfits(){
            return this.outfitIds.map(id => ({
                id,
                code: partCode(id),
                svg: this.$buildAvatar({ ...this.others, clo: id })
            }));
        },
        reportText(){
            return [
                `Outfit id: ${this.selectedId} (${this.selectedCode})`,
                `Full id: ${this.fullId}`,
                `env ${partCode(this.others.env)} / clo ${this.selectedCode} / head ${partCode(this.others.head)} / mouth ${partCode(this.others.mouth)} / eyes ${partCode(this.others.eyes)} / top ${partCode(this.others.top)}`,
                `Problem: `
            ].join('\n');
        }
    },

    methods:{
        partValue(key){
            return key === 'clo' ? this.selectedId : this.others[key];
        },
        partCode(n){
            return partCode(n);
        },
        shift(key, dir){
            this.others[key] = (this.others[key] + dir + 48) % 48;
        },
        randomOthers(){
            Object.keys(this.others).forEach(key => {
                this.others[key] = Math.floor(Math.random() * 48);
            });
        },
        resetOthers(){
            Object.keys(this.others).forEach(key => {
                this.others[key] = 0;
            });
        },
        async copyReport(){
            try {
                await navigator.clipboard.writeText(this.reportText);
            } catch (e) {
                // ■クリップボードが使えない環境では、欄を選択して手動でコピーしてもらう
                this.$refs.report.select();
                document.execCommand('copy');
            }
            this.copied = true;
            setTimeout(() => { this.copied = false; }, 1500);
        }
    }

}
</script>
