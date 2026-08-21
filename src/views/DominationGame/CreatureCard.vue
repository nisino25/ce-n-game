<template>
    <div 
      class="w-64 rounded-2xl shadow-lg p-4 bg-white border border-gray-200 hover:shadow-xl transition"
      :class="getCardBgColor(creature.area)">

        <!-- Title -->
        <div class="flex justify-between items-center mb-2">
            <h2 class="text-xl font-bold">
                {{ creature.label }}
            </h2>

            <span>
                Lv{{ creature.tier }}
            </span>
            <!-- <span
                class="text-xs px-2 py-1 rounded-full"
                :class="areaColor"
            >
                {{ creature.area }}
            </span> -->
        </div>

        <!-- Tier + Count -->
        <div class="mb-2 flex justify-between items-center text-sm text-gray-500">
            <!-- <span>
                Count: {{ creature.holdingCount }}
            </span> -->
        </div>


        <!-- Food -->
        <div>
            <div class="text-sm font-semibold">
                食べ物 :
                <span
                    v-for="(f, index) in creature.food"
                    :key="index"
                    class="inline-flex items-center justify-center
                          w-8 h-8
                          rounded-full
                          text-sm mr-1"
                    :class="foodColor(f)"
                >
                    <i
                        class="fa-solid"
                        :class="getFoodIcon(f)"
                        :title="f"
                    ></i>
                </span>

            </div>
        </div>

    </div>
</template>

<script>
export default {
    name: 'CreatureCard',

    props: {
        creature: {
            type: Object,
            required: true
        }
    },

    computed: {
        areaColor() {
            if (this.creature.area === 'land') {
                return 'bg-yellow-100 text-yellow-700'
            }
            if (this.creature.area === 'water') {
                return 'bg-blue-100 text-blue-700'
            }
            if (this.creature.area === 'river') {
                return 'bg-cyan-100 text-cyan-700'
            }
            return 'bg-gray-100 text-gray-700'
        }
    },
    methods: {
      getCardBgColor(area) {
        switch (area) {
            case 'land':
                return 'bg-yellow-100'
            case 'water':
                return 'bg-blue-100'
            case 'river':
                return 'bg-cyan-100'
            default:
                return 'bg-white'
        }
      },
      getFoodIcon(food) {
          const map = {
              '虫': 'fa-bug',
              '魚': 'fa-fish',
              '植物': 'fa-leaf',
              '小動物': 'fa-paw',
              '中動物': 'fa-dog',
              '大動物': 'fa-hippo',

          }

          return map[food] || 'fa-circle'
      },
      foodColor(food) {
            const colors = {
                '虫': 'bg-amber-100 text-amber-700',
                '小動物': 'bg-orange-100 text-orange-700',
                '中動物': 'bg-red-100 text-red-700',
                '大動物': 'bg-rose-200 text-rose-800',
                '魚': 'bg-blue-100 text-blue-700',
                '植物': 'bg-green-100 text-green-700',
                '藻類': 'bg-cyan-100 text-cyan-700'
            }

            return colors[food] || 'bg-gray-100 text-gray-600'
        }


    }
}
</script>
