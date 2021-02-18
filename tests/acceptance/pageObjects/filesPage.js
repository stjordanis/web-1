const util = require('util')
const navigationHelper = require('../helpers/navigationHelper')
const xpathHelper = require('../helpers/xpath')
const timeoutHelper = require('../helpers/timeoutHelper')
const { join, normalize } = require('../helpers/path')
const { client } = require('nightwatch-api')

module.exports = {
  url: function() {
    return this.api.launchUrl + ''
  },
  commands: {
    /**
     * like build-in navigate() but also waits till for the progressbar to appear and disappear
     * @param {string} folder - if given navigate to the folder without clicking the links
     * @returns {*}
     */
    navigateAndWaitTillLoaded: async function(folder = '') {
      await navigationHelper.navigateAndWaitTillElementPresent(
        join(this.api.launchUrl, '#/files/list/personal', folder),
        this.elements.newFileButtonLoaded
      )
      // wait for thumbnails
      await this.page.FilesPageElement.filesList().waitForAllThumbnailsLoaded()
    },
    /**
     *
     * @param {string} folder
     */
    navigateToFolder: function(folder) {
      return this.page.FilesPageElement.filesList()
        .navigateToFolder(folder)
        .waitForElementVisible('@breadcrumb')
        .assert.containsText('@breadcrumb', folder)
    },
    /**
     *
     * @param {string} resource
     */
    navigateToBreadcrumb: function(resource) {
      const breadcrumbElement = this.elements.resourceBreadcrumbClickable
      const resourceXpath = util.format(
        breadcrumbElement.selector,
        xpathHelper.buildXpathLiteral(resource)
      )
      return this.useStrategy(breadcrumbElement)
        .waitForElementVisible(resourceXpath)
        .click(resourceXpath)
        .useCss()
    },
    /**
     * Gets the breadcrumb element selector for the provided combination of clickable
     * and non-clickable breadcrumb segments.
     * Note: the combination (false,false) is invalid.
     *
     * @param clickable Whether a clickable breadcrumb is wanted
     * @param nonClickable Whether a non-clickable breadcrumb is wanted
     * @returns {null|{locateStrategy: string, selector: string}}
     */
    getBreadcrumbSelector: function(clickable, nonClickable) {
      if (clickable && nonClickable) {
        return this.elements.resourceBreadcrumb
      } else if (clickable) {
        return this.elements.resourceBreadcrumbClickable
      } else if (nonClickable) {
        return this.elements.resourceBreadcrumbNonClickable
      }
      return null
    },
    /**
     * Check if the breadcrumb element is visible or not
     *
     * @returns Promise
     */
    checkBreadcrumbVisibility: async function(resourceBreadcrumbXpath) {
      await this.useXpath()
        .waitForElementVisible({
          selector: resourceBreadcrumbXpath,
          abortOnFailure: false
        })
        .waitForAnimationToFinish()
        .useCss()
      return this
    },
    /**
     * Create a folder with the given name
     *
     * @param {string} name to set or null to use default value from dialog
     * @param {boolean} expectToSucceed
     */
    createFolder: async function(name, expectToSucceed = true) {
      await this.waitForElementVisible('@newFileMenuButtonAnyState')
        .waitForElementEnabled(this.elements.newFileMenuButtonAnyState.selector)
        .click('@newFileMenuButton')
        .click('@newFolderButton')
        .waitForElementVisible('@dialog')
        .waitForAnimationToFinish()

      if (name !== null) {
        await this.clearValueWithEvent('@dialogInput')
        await this.setValue('@dialogInput', name)
      }

      await this.click('@dialogConfirmBtn').waitForAjaxCallsToStartAndFinish()

      if (expectToSucceed) {
        await this.waitForElementNotPresent('@dialog')
      }

      return this
    },
    /**
     * Create a file with the given name
     *
     * @param {string} name to set or null to use default value from dialog
     * @param {boolean} expectToSucceed
     */
    createFile: async function(name, expectToSucceed = true) {
      await this.waitForElementVisible('@newFileMenuButton')
        .click('@newFileMenuButton')
        .waitForElementVisible('@newFileButton')
        .click('@newFileButton')
        .waitForElementVisible('@dialog')
        .waitForAnimationToFinish()

      if (name !== null) {
        await this.clearValueWithEvent('@dialogInput')
        await this.setValue('@dialogInput', name)
      }

      await this.click('@dialogConfirmBtn')

      if (expectToSucceed) {
        await this.waitForElementNotPresent('@dialog')
      }

      return this
    },
    selectFileForUpload: function(filePath) {
      return this.waitForElementVisible('@newFileMenuButton')
        .click('@newFileMenuButton')
        .waitForElementVisible('@fileUploadButton')
        .setValue('@fileUploadInput', filePath)
    },
    /**
     *
     * @param {string} filePath
     */
    uploadFile: function(filePath) {
      return this.selectFileForUpload(filePath)
        .waitForElementVisible(
          '@fileUploadProgress',
          this.api.globals.waitForConditionTimeout,
          this.api.globals.waitForConditionPollInterval,
          false
        )
        .waitForElementNotVisible('@fileUploadProgress')
        .click('@newFileMenuButton')
    },
    /**
     * This uploads a folder that is inside the selenium host,
     * not from the server, web or where the test runner is located.
     * So, the folder needs to be already there on the machine where the browser is running.
     *
     * @typedef {import('../customCommands/uploadRemote')} UploadRemote
     * We can extract the folder path from the callback of
     * [uploadRemote()]{@link UploadRemote.command}, which is similar to the following:
     * `/tmp/545cfb7e4b6e6603b2bbef4d69f82627/upload1734400381952243704file/new-lorem.txt`.
     * Extract `upload1734400381952243704file` and send it as arg here, otherwise, the whole
     * `/tmp/<sessionID>` folder will get uploaded
     *
     * @see below for working information
     *
     * @param {string} [folderName] - should be passed in as format "/upload<uniqueId>file" or "upload<uniqueId>file"
     */
    uploadSessionFolder: function(folderName = '') {
      /*
      files uploaded through selenium endpoints are saved in
      /tmp/<sessionId>/upload<uniqueId>file/<filename>.

      So, we are trying to upload the "/tmp/<sessionId>" (or, if the folderName is set, it's "/tmp/<sessionId>/<folderName>")
      folder through web, by setting value on folder input field to that folder, and hopefully,
      web gets the `onChange` event and uploads that folder.
       */
      const sessionId = this.api.sessionId
      folderName = normalize(folderName)
      folderName = `/tmp/${sessionId}/${folderName}`
      return this.uploadFolder(folderName)
    },

    /**
     * Upload folder which is inside selenium
     *
     * @param {string} folderName
     */
    uploadFolder: function(folderName) {
      return this.waitForElementVisible('@newFileMenuButton')
        .click('@newFileMenuButton')
        .waitForElementVisible('@fileUploadButton')
        .setValue('@folderUploadInput', folderName)
        .waitForElementVisible(
          '@fileUploadProgress',
          this.api.globals.waitForConditionTimeout,
          this.api.globals.waitForConditionPollInterval,
          false
        )
        .waitForElementNotVisible('@fileUploadProgress')
        .click('@newFileMenuButton')
    },
    /**
     * Returns whether files or folders can be created in the current page.
     */
    canCreateFiles: async function() {
      let canCreate = false
      await this.waitForElementVisible('@newFileMenuButtonAnyState').getAttribute(
        '@newFileMenuButtonAnyState',
        'disabled',
        result => {
          canCreate = result.value === 'true'
        }
      )
      return canCreate
    },
    deleteAllCheckedFiles: function() {
      return this.waitForElementVisible('@deleteSelectedButton')
        .click('@deleteSelectedButton')
        .waitForElementVisible('@dialog')
        .waitForAnimationToFinish()
        .click('@dialogConfirmBtn')
        .waitForAjaxCallsToStartAndFinish()
        .waitForElementNotPresent('@dialog')
    },
    isSidebarVisible: async function(timeout = null) {
      let isVisible = false
      timeout = timeoutHelper.parseTimeout(timeout)
      await this.isVisible(
        {
          locateStrategy: this.elements.sideBar.locateStrategy,
          selector: this.elements.sideBar.selector,
          timeout: timeout
        },
        result => {
          isVisible = result.status === 0
        }
      )
      return isVisible
    },
    copyPermalinkFromFilesAppBar: function() {
      return this.waitForElementVisible('@permalinkCopyButton').click('@permalinkCopyButton')
    },
    checkSidebarItem: function(resourceName) {
      return this.getAttribute('@sidebarItemName', 'innerText', function(itemName) {
        this.assert.strictEqual(
          itemName.value,
          resourceName,
          `In sidebar is different item - ${itemName.value}`
        )
      })
    },
    confirmFileOverwrite: function() {
      return (
        this.waitForElementVisible('@dialog')
          .waitForAnimationToFinish()
          // clicking new resource dropdown to hide it, as we upload the file directly using `setValue`.
          // The overwrite dialog is too fast and does not give time to close the dropdown beforehand
          .clickElementAt(this.elements.newResourceDropdown.selector, 0, 0)
          .waitForElementNotVisible('@newFolderButton')
          .click('@dialogConfirmBtn')
          .waitForElementNotPresent('@dialog')
          .waitForAjaxCallsToStartAndFinish()
      )
    },
    triesToCreateExistingFile: function(fileName) {
      return this.waitForElementVisible('@newFileMenuButton')
        .click('@newFileMenuButton')
        .waitForElementVisible('@newFileButton')
        .click('@newFileButton')
        .waitForElementVisible('@dialogInput')
        .clearValueWithEvent('@dialogInput')
        .setValue('@dialogInput', fileName)
    },
    checkForButtonDisabled: function() {
      return this.waitForElementVisible('@dialogConfirmBtnDisabled')
    },

    moveMultipleResources: function(target) {
      // Trigger move
      this.click('@moveSelectedBtn')

      // Execute move
      return client.page.locationPicker().selectFolderAndConfirm(target)
    },

    attemptToMoveMultipleResources: async function(target) {
      // Trigger move
      await this.click('@moveSelectedBtn')

      return client.page.locationPicker().selectFolder(target)
    },

    copyMultipleResources: function(target) {
      // Trigger copy
      this.click('@copySelectedBtn')

      // Execute copy
      return client.page.locationPicker().selectFolderAndConfirm(target)
    },

    attemptToCopyMultipleResources: async function(target) {
      // Trigger copy
      await this.click('@copySelectedBtn')

      return client.page.locationPicker().selectFolder(target)
    },
    /**
     * Create a md file with the given name
     *
     * @param {string} name to set or null to use default value from dialog
     * @param {boolean} expectToSucceed
     */
    createMarkdownFile: async function(name, expectToSucceed = true) {
      await this.waitForElementVisible('@newFileMenuButton')
        .click('@newFileMenuButton')
        .waitForElementVisible('@newMdFileButton')
        .click('@newMdFileButton')
        .waitForElementVisible('@dialog')
        .waitForAnimationToFinish()

      if (name !== null) {
        await this.clearValueWithEvent('@dialogInput')
        await this.setValue('@dialogInput', name)
      }

      await this.initAjaxCounters()
        .click('@dialogConfirmBtn')
        .waitForOutstandingAjaxCalls()

      if (expectToSucceed) {
        await this.waitForElementNotPresent('@dialog')
      }

      return this
    },
    closeTextEditor: function() {
      return this.waitForElementVisible('@editorCloseBtn').click('@editorCloseBtn')
    },
    isRootDirectory: async function() {
      return await this.assert.not.elementPresent('@breadcrumb')
    },
    isSearchBarVisible: async function() {
      let searchBar
      await this.api.elements('@searchInput', result => {
        searchBar = result.value
      })
      return searchBar.length > 0
    },
    clearSelection: async function() {
      await this.useXpath()
        .waitForElementVisible('@clearSelectionBtn')
        .click('@clearSelectionBtn')
        .waitForElementNotPresent('@clearSelectionBtn')
    }
  },
  elements: {
    searchInput: {
      selector: '.oc-search-input input'
    },
    newFileMenuButtonAnyState: {
      selector: '#new-file-menu-btn'
    },
    newFileMenuButton: {
      selector: '#new-file-menu-btn:enabled'
    },
    deleteSelectedButton: {
      selector: '#delete-selected-btn'
    },
    newResourceDropdown: {
      selector: '#new-file-menu-drop'
    },
    newFolderButton: {
      selector: '#new-folder-btn'
    },
    newFileButton: {
      selector: '#new-file-menu-drop .new-file-btn-txt'
    },
    newMdFileButton: {
      selector: '#new-file-menu-drop .new-file-btn-md'
    },
    newFolderInput: {
      selector: '#new-folder-input'
    },
    newFileInput: {
      selector: '#new-file-input'
    },
    newFolderOkButton: {
      selector: '#new-folder-ok'
    },
    permalinkCopyButton: {
      selector: '#files-sidebar-private-link-label'
    },
    breadcrumb: {
      selector: '#files-breadcrumb li:nth-of-type(2)'
    },
    newFileButtonLoaded: {
      selector:
        '//button[@id="new-file-menu-btn" and contains(@class, "oc-button-primary") and not(@disabled)]',
      locateStrategy: 'xpath'
    },
    breadcrumbMobile: {
      selector: '//span[@class="oc-breadcrumb-drop-label-text" and text()=%s]',
      locateStrategy: 'xpath'
    },
    resourceBreadcrumb: {
      selector: '//div[@id="files-breadcrumb"]//*[(self::a or self::span) and contains(text(),%s)]',
      locateStrategy: 'xpath'
    },
    resourceBreadcrumbClickable: {
      selector: '//div[@id="files-breadcrumb"]//a[contains(text(),%s)]',
      locateStrategy: 'xpath'
    },
    resourceBreadcrumbNonClickable: {
      selector: '//div[@id="files-breadcrumb"]//span[contains(text(),%s)]',
      locateStrategy: 'xpath'
    },
    fileUploadButton: {
      selector: '#files-file-upload-button'
    },
    fileUploadInput: {
      selector: '#fileUploadInput'
    },
    folderUploadInput: {
      selector: '#folderUploadInput'
    },
    fileUploadProgress: {
      selector: '#files-upload-progress'
    },
    sideBar: {
      selector: '//div[@class="sidebar-container"]',
      locateStrategy: 'xpath'
    },
    fileOverwriteConfirm: {
      selector: '#files-overwrite-confirm'
    },
    sidebarItemName: {
      selector: '#files-sidebar-item-name'
    },
    dialog: {
      selector: '.oc-modal'
    },
    dialogConfirmBtn: {
      selector: '.oc-modal-body-actions-confirm'
    },
    dialogConfirmBtnDisabled: {
      selector:
        '//button[contains(@class, "oc-modal-body-actions-confirm") and @disabled="disabled"]',
      locateStrategy: 'xpath'
    },
    dialogCancelBtn: {
      selector: '.oc-modal-body-actions-cancel'
    },
    dialogInput: {
      selector: '.oc-modal-body-input > input'
    },
    moveSelectedBtn: {
      selector: '#move-selected-btn'
    },
    copySelectedBtn: {
      selector: '#copy-selected-btn'
    },
    editorCloseBtn: {
      selector: '#markdown-editor-app-bar .uk-text-right .oc-button'
    },
    clearSelectionBtn: {
      selector: '//span[contains(text(),"Clear selection")]',
      locateStrategy: 'xpath'
    },
    cancelMoveCopyBtn: {
      selector: '//button[.="Cancel"]',
      locateStrategy: 'xpath'
    }
  }
}
