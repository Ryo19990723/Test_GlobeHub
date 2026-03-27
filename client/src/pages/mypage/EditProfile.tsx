import { useState, useRef, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, Loader2, X } from "lucide-react";
import { SiInstagram } from "react-icons/si";
import { FaXTwitter } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { AvatarCropper } from "@/components/common/AvatarCropper";
import { apiRequest } from "@/lib/queryClient";
import { CITIES_MASTER, type CityData } from "@/data/cities";

const profileSchema = z.object({
  displayName: z.string().min(1, "表示名は必須です").max(50, "表示名は50文字以内で入力してください"),
  bio: z.string().max(200, "ひとことは200文字以内で入力してください").optional(),
  instagramUrl: z.string().url("有効なURLを入力してください").optional().or(z.literal("")),
  xUrl: z.string().url("有効なURLを入力してください").optional().or(z.literal("")),
  location: z.string().max(100, "居住地は100文字以内で入力してください").optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileData {
  user: {
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    instagramUrl: string | null;
    xUrl: string | null;
    location: string | null;
  };
}

export default function EditProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [locationSearch, setLocationSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<CityData | null>(null);
  const [customLocation, setCustomLocation] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [useCustomLocation, setUseCustomLocation] = useState(false);

  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ["/api/me"],
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      instagramUrl: "",
      xUrl: "",
      location: "",
    },
  });

  useEffect(() => {
    if (profile?.user) {
      form.reset({
        displayName: profile.user.displayName || "",
        bio: profile.user.bio || "",
        instagramUrl: profile.user.instagramUrl || "",
        xUrl: profile.user.xUrl || "",
        location: profile.user.location || "",
      });
      
      if (profile.user.location) {
        const foundCity = CITIES_MASTER.find(c => 
          c.cityJp === profile.user.location || c.displayJp === profile.user.location
        );
        if (foundCity) {
          setSelectedLocation(foundCity);
          setUseCustomLocation(false);
        } else {
          setCustomLocation(profile.user.location);
          setUseCustomLocation(true);
        }
      }
    }
  }, [profile, form]);

  const filteredLocations = useMemo(() => {
    if (!locationSearch.trim()) return [];
    const query = locationSearch.toLowerCase();
    return CITIES_MASTER.filter((c) => {
      const searchFields = [c.cityJp, c.cityEn, c.aliases].join(' ').toLowerCase();
      return searchFields.includes(query);
    }).slice(0, 15);
  }, [locationSearch]);

  const updateMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return apiRequest("PUT", "/api/me", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "プロフィールを更新しました",
      });
      setLocation("/mypage");
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "プロフィールの更新に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({
        title: "エラー",
        description: "JPEG、PNG、WebP形式の画像を選択してください",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "エラー",
        description: "ファイルサイズは10MB以下にしてください",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setShowCropper(true);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", croppedBlob, "avatar.jpg");

      const response = await fetch("/api/me/avatar", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "アバターを更新しました",
      });
      setShowCropper(false);
      setSelectedFile(null);
    } catch (error) {
      toast({
        title: "エラー",
        description: "アバターのアップロードに失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleLocationSelect = (city: CityData) => {
    setSelectedLocation(city);
    setLocationSearch("");
    setShowLocationDropdown(false);
    setUseCustomLocation(false);
    form.setValue("location", city.cityJp);
  };

  const handleCustomLocationChange = (value: string) => {
    setCustomLocation(value);
    form.setValue("location", value);
  };

  const clearLocation = () => {
    setSelectedLocation(null);
    setCustomLocation("");
    setLocationSearch("");
    setUseCustomLocation(false);
    form.setValue("location", "");
  };

  const switchToCustomLocation = () => {
    setSelectedLocation(null);
    setUseCustomLocation(true);
    setShowLocationDropdown(false);
    form.setValue("location", customLocation);
  };

  const onSubmit = (data: ProfileFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return <LoadingSpinner className="min-h-screen" />;
  }

  const displayName = profile?.user.displayName || "ユーザー";
  const avatarUrl = profile?.user.avatarUrl;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center h-14 px-4 border-b sticky top-0 bg-white z-10">
        <Link href="/mypage">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold ml-2">プロフィール編集</h1>
      </header>

      <main className="flex-1 p-4">
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <Avatar className="w-24 h-24">
              <AvatarImage src={avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="text-2xl bg-[#7C3AED] text-white">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-[#7C3AED] rounded-full flex items-center justify-center text-white"
              data-testid="button-upload-avatar"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            タップして画像を変更
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>表示名 *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="表示名を入力"
                      data-testid="input-displayname"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ひとこと</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="自己紹介を入力"
                      className="resize-none"
                      rows={3}
                      data-testid="input-bio"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {(field.value?.length || 0)}/200文字
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={() => (
                <FormItem>
                  <FormLabel>居住地</FormLabel>
                  <FormControl>
                    <div className="relative">
                      {selectedLocation ? (
                        <div className="flex items-center h-11 px-3 border border-input rounded-md bg-background">
                          <span className="flex-1 text-base truncate" data-testid="text-selected-location">
                            {selectedLocation.displayJp}
                          </span>
                          <button
                            type="button"
                            data-testid="button-clear-location"
                            onClick={clearLocation}
                            className="ml-2 p-1 rounded-full hover:bg-muted"
                          >
                            <X className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>
                      ) : useCustomLocation ? (
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="居住地を自由入力"
                            value={customLocation}
                            onChange={(e) => handleCustomLocationChange(e.target.value)}
                            data-testid="input-custom-location"
                            className="h-11"
                          />
                          <button
                            type="button"
                            onClick={clearLocation}
                            className="p-2 rounded-full hover:bg-muted"
                          >
                            <X className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Input
                            placeholder="都市名を検索"
                            value={locationSearch}
                            onChange={(e) => {
                              setLocationSearch(e.target.value);
                              setShowLocationDropdown(true);
                            }}
                            onFocus={() => setShowLocationDropdown(true)}
                            data-testid="input-location-search"
                            className="h-11"
                          />
                          {showLocationDropdown && locationSearch && (
                            <div className="absolute top-full left-0 right-0 bg-background border border-border rounded-md mt-1 max-h-48 overflow-y-auto z-10 shadow-lg">
                              {filteredLocations.length > 0 ? (
                                <>
                                  {filteredLocations.map((city, index) => (
                                    <button
                                      key={`${city.cityJp}-${city.countryJp}-${index}`}
                                      type="button"
                                      onClick={() => handleLocationSelect(city)}
                                      className="w-full text-left px-3 py-2 hover-elevate text-sm"
                                      data-testid={`location-option-${index}`}
                                    >
                                      {city.displayJp}
                                    </button>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={switchToCustomLocation}
                                    className="w-full text-left px-3 py-2 hover-elevate text-sm text-[#7C3AED] border-t"
                                    data-testid="button-custom-location"
                                  >
                                    「{locationSearch}」を自由入力で使用
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCustomLocation(locationSearch);
                                    setUseCustomLocation(true);
                                    form.setValue("location", locationSearch);
                                    setShowLocationDropdown(false);
                                  }}
                                  className="w-full text-left px-3 py-2 hover-elevate text-sm text-[#7C3AED]"
                                  data-testid="button-use-custom-location"
                                >
                                  「{locationSearch}」を自由入力で使用
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    都市を検索するか、候補にない場合は自由に入力できます
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormLabel className="text-base">SNSリンク</FormLabel>
              
              <FormField
                control={form.control}
                name="instagramUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <SiInstagram className="w-5 h-5 text-white" />
                        </div>
                        <Input
                          type="url"
                          placeholder="https://instagram.com/username"
                          data-testid="input-instagram"
                          className="h-11"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="xUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                          <FaXTwitter className="w-5 h-5 text-white" />
                        </div>
                        <Input
                          type="url"
                          placeholder="https://x.com/username"
                          data-testid="input-x"
                          className="h-11"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-[#7C3AED] hover:bg-[#6D28D9]"
              disabled={updateMutation.isPending}
              data-testid="button-save"
            >
              {updateMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </form>
        </Form>
      </main>

      <AvatarCropper
        open={showCropper}
        onClose={() => {
          setShowCropper(false);
          setSelectedFile(null);
        }}
        imageFile={selectedFile}
        onCropComplete={handleCropComplete}
        isUploading={isUploading}
      />
    </div>
  );
}
