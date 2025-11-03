import { Facebook, Twitter, Instagram, Phone, Mail, Globe, MapPin, Youtube } from "lucide-react";
import Link from "next/link";

export function Footer() {
    return (
        <footer className="bg-card border-t border-border" data-testid="footer">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-2">
                <div className="grid md:grid-cols-4 gap-8">
                    {/* Foundation Info */}
                    <div className="md:col-span-2" data-testid="footer-foundation-info">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 rounded-lg overflow-hidden">
                                <img
                                    src="/android-chrome-512x512.png"
                                    alt="Khadim-e-Millat Welfare Foundation Logo"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">Khadim-e-Millat</h3>
                                <p className="text-sm text-muted-foreground">Welfare Foundation</p>
                            </div>
                        </div>
                        <p className="text-muted-foreground mb-4" data-testid="footer-description">
                            Established in 2021 in Gorakhpur, Uttar Pradesh, transforming communities through sustainable scrap collection and welfare programs.
                            Every donation creates opportunities for those in need.
                        </p>
                        <div className="space-x-4 flex" data-testid="footer-social-links">
                            <Link href="https://www.youtube.com/@muftidawoodqasmiofficial" className="w-9 h-9 bg-muted hover:bg-primary hover:text-primary-foreground rounded-lg flex items-center justify-center transition-colors" data-testid="social-facebook">
                                <Youtube className="h-5 w-5" />
                            </Link>
                            <Link href="https://www.facebook.com/p/Khadim-e-Millat-Welfare-Foundation-61557994989166/" className="w-9 h-9 bg-muted hover:bg-primary hover:text-primary-foreground rounded-lg flex items-center justify-center transition-colors" data-testid="social-facebook">
                                <Facebook className="h-5 w-5" />
                            </Link>
                            <Link href="#" className="w-9 h-9 bg-muted hover:bg-primary hover:text-primary-foreground rounded-lg flex items-center justify-center transition-colors" data-testid="social-twitter">
                                <Twitter className="h-5 w-5" />
                            </Link>
                            <Link href="#" className="w-9 h-9 bg-muted hover:bg-primary hover:text-primary-foreground rounded-lg flex items-center justify-center transition-colors" data-testid="social-instagram">
                                <Instagram className="h-5 w-5" />
                            </Link>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div data-testid="footer-quick-links">
                        <h4 className="font-semibold text-foreground mb-4">Quick Links</h4>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/" className="text-muted-foreground hover:text-primary transition-colors" data-testid="footer-link-home">
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link href="/marketplace" className="text-muted-foreground hover:text-primary transition-colors" data-testid="footer-link-marketplace">
                                    Marketplace
                                </Link>
                            </li>
                            <li>
                                <Link href="/donate" className="text-muted-foreground hover:text-primary transition-colors" data-testid="footer-link-donate">
                                    Donate
                                </Link>
                            </li>
                            <li>
                                <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors" data-testid="footer-link-about">
                                    About Us
                                </Link>
                            </li>
                            <li>
                                <Link href="/activities" className="text-muted-foreground hover:text-primary transition-colors" data-testid="footer-link-activities">
                                    Activities
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div data-testid="footer-contact-info">
                        <h4 className="font-semibold text-foreground mb-4">Contact Us</h4>
                        <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-center text-sm" data-testid="contact-phone">
                                <Phone className="h-4 w-4 mr-2" />
                                <Link href="tel:+918081747259" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                                    +91 80817 47259
                                </Link>
                            </li>
                            <li className="flex items-center text-sm" data-testid="contact-email">
                                <Mail className="h-4 w-4 mr-2" />
                                <Link href="mailto:support@khadimemillat.org" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                                    support@khadimemillat.org
                                </Link>
                            </li>
                            <li className="flex items-center text-sm" data-testid="contact-website">
                                <Globe className="h-4 w-4 mr-2" />
                                <Link href="https://khadimemillat.org" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                                    khadimemillat.org
                                </Link>
                            </li>
                            <li className="flex items-center text-sm" data-testid="contact-email">
                                <MapPin className="h-4 w-4 mr-2" />
                                <Link href="https://share.google/iBzqMXM0KkT4DHKF3" target="_blank" className="hover:text-primary transition-colors">
                                    <span>
                                        Gorakhpur, Uttar Pradesh, India
                                    </span>
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-border pt-8 mt-8 text-center" data-testid="footer-copyright">
                    <p className="text-muted-foreground">
                        © 2025 Khadim-e-Millat Welfare Foundation. All rights reserved. <br /> Under Development by <Link href="https://www.codvista.com" target="_blank" className="text-purple-600 underline">Cod Vista</Link>
                    </p>
                </div>
            </div>
        </footer>
    );
}
