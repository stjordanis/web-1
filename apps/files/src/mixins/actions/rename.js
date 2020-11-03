import { mapActions, mapGetters } from 'vuex'

import { checkRoute } from '../../helpers/route'

export default {
  computed: {
    ...mapGetters('Files', ['activeFiles']),

    $_rename_items() {
      return [
        {
          icon: 'edit',
          ariaLabel: () => {
            return this.$gettext('Rename')
          },
          handler: this.$_rename_trigger,
          isEnabled: ({ resource, parent }) => {
            if (checkRoute(['files-trashbin'], this.$route.name)) {
              return false
            }

            if (parent && !parent.canRename()) {
              return false
            }
            return resource.canRename()
          }
        }
      ]
    }
  },
  methods: {
    ...mapActions([
      'createModal',
      'hideModal',
      'setModalInputErrorMessage',
      'toggleModalConfirmButton'
    ]),
    ...mapActions('Files', ['renameFile']),

    $_rename_trigger(resource) {
      const isFolder = resource.type === 'folder'
      const confirmAction = newName => {
        this.$_rename_renameResource(resource, newName)
      }
      const checkName = newName => {
        this.$_rename_checkNewName(resource.name, newName)
      }

      const modal = {
        variation: 'info',
        title: isFolder
          ? this.$gettext('Rename folder ') + resource.name
          : this.$gettext('Rename file ' + resource.name),
        cancelText: this.$gettext('Cancel'),
        confirmText: this.$gettext('Rename'),
        hasInput: true,
        inputValue: resource.name,
        inputPlaceholder: isFolder
          ? this.$gettext('Enter new folder name…')
          : this.$gettext('Enter new file name…'),
        inputLabel: isFolder ? this.$gettext('Folder name') : this.$gettext('File name'),
        onCancel: this.hideModal,
        onConfirm: confirmAction,
        onInput: checkName
      }

      this.createModal(modal)
    },

    $_rename_checkNewName(currentName, newName) {
      if (!newName) {
        return this.setModalInputErrorMessage(this.$gettext('The name cannot be empty'))
      }

      if (/[/]/.test(newName)) {
        return this.setModalInputErrorMessage(this.$gettext('The name cannot contain "/"'))
      }

      if (newName === '.') {
        return this.setModalInputErrorMessage(this.$gettext('The name cannot be equal to "."'))
      }

      if (newName === '..') {
        return this.setModalInputErrorMessage(this.$gettext('The name cannot be equal to ".."'))
      }

      if (/\s+$/.test(newName)) {
        return this.setModalInputErrorMessage(this.$gettext('The name cannot end with whitespace'))
      }

      if (!this.flatFileList) {
        const exists = this.activeFiles.find(n => {
          if (n.name === newName && currentName !== newName) {
            return n
          }
        })

        if (exists) {
          const translated = this.$gettext('The name "%{name}" is already taken')

          return this.setModalInputErrorMessage(
            this.$gettextInterpolate(translated, { name: newName }, true)
          )
        }
      }

      this.setModalInputErrorMessage(null)
    },

    $_rename_renameResource(resource, newName) {
      this.toggleModalConfirmButton()

      this.renameFile({
        client: this.$client,
        file: resource,
        newValue: newName,
        publicPage: this.publicPage()
      })
        .then(() => {
          this.hideModal()
        })
        .catch(error => {
          this.toggleModalConfirmButton()
          let translated = this.$gettext('Error while renaming "%{file}" to "%{newName}"')
          if (error.statusCode === 423) {
            translated = this.$gettext(
              'Error while renaming "%{file}" to "%{newName}" - the file is locked'
            )
          }
          const title = this.$gettextInterpolate(
            translated,
            { file: resource.name, newName: newName },
            true
          )
          this.showMessage({
            title: title,
            status: 'danger',
            autoClose: {
              enabled: true
            }
          })
        })
    }
  }
}
