<?php

class StalwartPasswordPlugin extends \RainLoop\Plugins\AbstractPlugin
{
    const
        NAME = 'Stalwart Password',
        AUTHOR = 'internal',
        URL = '',
        VERSION = '1.0.6',
        RELEASE = '2026-04-19',
        REQUIRED = '2.0.0',
        CATEGORY = 'Security',
        LICENSE = 'MIT',
        DESCRIPTION = 'Let users change their Stalwart mailbox password via the admin management API.';

    public function Init(): void
    {
        $this->addJsonHook('ChangePassword');
        $this->addJs('js/stalwart-password.js');
    }

    protected function configMapping(): array
    {
        return [
            \RainLoop\Plugins\Property::NewInstance('api_url')
                ->SetLabel('Stalwart admin API base URL')
                ->SetPlaceholder('https://admin.webmail.klr.kr')
                ->SetDefaultValue('https://admin.webmail.klr.kr'),
            \RainLoop\Plugins\Property::NewInstance('api_token')
                ->SetLabel('Stalwart admin Bearer token (password-mgmt scope only)')
                ->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD),
            \RainLoop\Plugins\Property::NewInstance('min_length')
                ->SetLabel('Minimum new password length')
                ->SetType(\RainLoop\Enumerations\PluginPropertyType::INT)
                ->SetAllowedInJs(true)
                ->SetDefaultValue(12),
        ];
    }

    public function ChangePassword(): array
    {
        $oActions = $this->Manager()->Actions();
        $oAccount = $oActions->GetAccount();
        if (!$oAccount) {
            return $this->jsonResponse(__FUNCTION__, ['Result' => false, 'Error' => '인증되지 않았습니다']);
        }

        $sOld = (string)$oActions->GetActionParam('OldPassword', '');
        $sNew = (string)$oActions->GetActionParam('NewPassword', '');
        $iMin = (int)$this->Config()->Get('plugin', 'min_length', 12);

        if ('' === $sOld || '' === $sNew) {
            return $this->jsonResponse(__FUNCTION__, ['Result' => false, 'Error' => '비밀번호를 입력해주세요']);
        }
        if (\mb_strlen($sNew) < $iMin) {
            return $this->jsonResponse(__FUNCTION__, ['Result' => false, 'Error' => '새 비밀번호는 최소 ' . $iMin . '자 이상이어야 합니다']);
        }
        if ($sNew === $sOld) {
            return $this->jsonResponse(__FUNCTION__, ['Result' => false, 'Error' => '새 비밀번호는 현재 비밀번호와 달라야 합니다']);
        }

        // Re-verify current password against the session's IMAP password
        $sSessionPass = (string)$oAccount->ImapPass();
        if ('' === $sSessionPass || $sSessionPass !== $sOld) {
            return $this->jsonResponse(__FUNCTION__, ['Result' => false, 'Error' => '현재 비밀번호가 올바르지 않습니다']);
        }

        $sApiUrl = \rtrim((string)$this->Config()->Get('plugin', 'api_url', ''), '/');
        $sToken  = (string)$this->Config()->Get('plugin', 'api_token', '');
        if ('' === $sApiUrl || '' === $sToken) {
            return $this->jsonResponse(__FUNCTION__, ['Result' => false, 'Error' => '플러그인이 구성되지 않았습니다 (api_url / api_token)']);
        }

        $sLogin = (string)$oAccount->ImapUser();
        // SnappyMail is configured with shortLogin:true — $sLogin is the short account name
        $sPrincipalUrl = $sApiUrl . '/api/principal/' . \rawurlencode($sLogin);

        // GET current principal to retrieve existing secrets (hashes) so we can remove them
        $aGet = $this->httpRequest('GET', $sPrincipalUrl, $sToken);
        if (200 !== $aGet['code']) {
            return $this->jsonResponse(__FUNCTION__, ['Result' => false, 'Error' => 'Stalwart 조회 실패 (' . $aGet['code'] . ')']);
        }
        $aPrincipal  = \json_decode($aGet['body'], true);
        $aOldSecrets = [];
        if (\is_array($aPrincipal)) {
            $aOldSecrets = $aPrincipal['secrets']
                ?? $aPrincipal['data']['secrets']
                ?? [];
        }
        if (!\is_array($aOldSecrets)) {
            $aOldSecrets = [];
        }

        // SHA-512 crypt ($6$) to match Stalwart's stored format
        $sSalt    = \substr(\bin2hex(\random_bytes(8)), 0, 16);
        $sNewHash = \crypt($sNew, '$6$' . $sSalt . '$');
        if (!\is_string($sNewHash) || !\str_starts_with($sNewHash, '$6$')) {
            return $this->jsonResponse(__FUNCTION__, ['Result' => false, 'Error' => '비밀번호 해시 생성 실패']);
        }

        // Build PATCH matching the Stalwart admin UI's own shape: add new, remove each old
        $aOps = [['action' => 'addItem', 'field' => 'secrets', 'value' => $sNewHash]];
        foreach ($aOldSecrets as $sExisting) {
            if (\is_string($sExisting) && '' !== $sExisting) {
                $aOps[] = ['action' => 'removeItem', 'field' => 'secrets', 'value' => $sExisting];
            }
        }

        $aPatch = $this->httpRequest('PATCH', $sPrincipalUrl, $sToken, \json_encode($aOps));
        if ($aPatch['code'] < 200 || $aPatch['code'] >= 300) {
            return $this->jsonResponse(__FUNCTION__, [
                'Result' => false,
                'Error'  => 'Stalwart 업데이트 실패 (' . $aPatch['code'] . '): ' . \mb_substr((string)$aPatch['body'], 0, 200),
            ]);
        }

        return $this->jsonResponse(__FUNCTION__, [
            'Result'  => true,
            'Message' => '비밀번호가 변경되었습니다. 로그아웃 후 새 비밀번호로 다시 로그인해주세요.',
        ]);
    }

    private function httpRequest(string $sMethod, string $sUrl, string $sToken, ?string $sBody = null): array
    {
        $rCh = \curl_init($sUrl);
        $aHeaders = [
            'Authorization: Bearer ' . $sToken,
            'Accept: application/json',
        ];
        if (null !== $sBody) {
            $aHeaders[] = 'Content-Type: application/json';
        }
        \curl_setopt_array($rCh, [
            CURLOPT_CUSTOMREQUEST  => $sMethod,
            CURLOPT_POSTFIELDS     => $sBody,
            CURLOPT_HTTPHEADER     => $aHeaders,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_CONNECTTIMEOUT => 5,
        ]);
        $sResp = \curl_exec($rCh);
        $iCode = (int)\curl_getinfo($rCh, CURLINFO_HTTP_CODE);
        $sErr  = \curl_error($rCh);
        \curl_close($rCh);
        if (false === $sResp && '' !== $sErr) {
            return ['code' => 0, 'body' => $sErr];
        }
        return ['code' => $iCode, 'body' => (string)$sResp];
    }
}
