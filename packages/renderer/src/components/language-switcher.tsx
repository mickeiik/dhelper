import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTranslation } from "react-i18next"
import { Button } from "./ui/button"
import { DropdownMenuRadioGroup } from "@radix-ui/react-dropdown-menu"

export function LanguageSwitcher() {
    const { i18n, t } = useTranslation();

    const getLanguageName = (code: string) => {
        const displayNames = new Intl.DisplayNames([code], { type: 'language' });
        const name = displayNames.of(code) || code;
        return name.charAt(0).toUpperCase() + name.slice(1);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">{getLanguageName(i18n.language)}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>{t('language.select')}</DropdownMenuLabel>
                <DropdownMenuSeparator/>
                <DropdownMenuRadioGroup value={i18n.language} onValueChange={i18n.changeLanguage}>
                    <DropdownMenuRadioItem value="en">{t('language.english')}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="fr">{t('language.french')}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="es">{t('language.spanish')}</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}