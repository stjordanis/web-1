import { mapActions } from 'vuex'

import { checkRoute } from '../../helpers/route'

export default {
  computed: {
    $_navigate_items() {
      return [
        {
          icon: 'folder-open',
          handler: resource => this.$_navigate_trigger(resource),
          ariaLabel: () =>
            this.$pgettext('Action in the files list row to open a folder', 'Open folder'),
          isEnabled: ({ resource }) => {
            if (checkRoute(['files-trashbin'], this.$route.name)) {
              return false
            }

            return resource.type === 'folder'
          },
          canBeDefault: true
        }
      ]
    }
  },
  methods: {
    ...mapActions('Files', ['resetSearch']),

    $_navigate_trigger(folder) {
      if (this.searchTerm !== '' && this.$route.params.item === folder.path) {
        this.resetSearch()
      }
      let route = 'files-personal'
      if (this.publicPage()) {
        route = 'files-public-list'
      }
      this.$router.push({
        name: route,
        params: {
          item: folder.path
        }
      })
    }
  }
}
